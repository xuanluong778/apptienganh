/**
 * Dịch nghĩa VI còn thiếu/sai bằng OpenAI (đọc .env.local).
 * Chạy: node scripts/fix-story-vocab-vi-openai.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function hasVi(text) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text || ""));
}

function isBadVi(vi, word) {
  const v = String(vi || "").trim();
  if (!v) return true;
  if (/MYMEMORY WARNING|USAGE LIMIT|nghĩa tiếng việt của từ/i.test(v)) return true;
  if (v.toLowerCase() === word.toLowerCase()) return true;
  if (!hasVi(v)) return true;
  return false;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function translateBatch(words) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  if (!key) throw new Error("Thiếu OPENAI_API_KEY trong .env.local");

  const list = words.join(", ");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You translate English words to short Vietnamese meanings for children. Output only valid JSON object word→vi.",
        },
        {
          role: "user",
          content: `JSON only. Example: {"dog":"con chó","run":"chạy"}\nWords: ${list}`,
        },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  const raw = json?.choices?.[0]?.message?.content || "";
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

async function main() {
  loadEnvLocal();
  const target = path.join(root, "lib/kids-stories/story-vocab-meta.generated.js");
  const src = fs.readFileSync(target, "utf8");
  const meta = JSON.parse(src.replace(/^[\s\S]*?export default /, "").replace(/;\s*$/, ""));

  const bad = Object.keys(meta).filter((w) => isBadVi(meta[w].vi, w));
  console.log("Need VI fix:", bad.length);

  const batches = chunk(bad, 25);
  let fixed = 0;
  for (let b = 0; b < batches.length; b += 1) {
    const words = batches[b];
    console.log(`Batch ${b + 1}/${batches.length} (${words.length} words)...`);
    const map = await translateBatch(words);
    for (const w of words) {
      const vi = String(map[w] || map[w.toLowerCase()] || "").trim();
      if (vi && !isBadVi(vi, w)) {
        meta[w].vi = vi;
        fixed += 1;
      }
    }
  }

  fs.writeFileSync(
    target,
    `/** Auto-generated — npm run build:story-vocab */\nexport default ${JSON.stringify(meta, null, 2)};\n`
  );
  console.log("Fixed", fixed, "meanings. Saved →", target);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
