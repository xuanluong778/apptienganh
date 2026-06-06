/** Sửa nghĩa VI bị dạng "nghĩa tiếng Việt của từ ..." */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { translateWithMyMemoryPublicApi } from "../lib/ai/providers/mymemory-translate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "../lib/kids-stories/story-vocab-meta.generated.js");

function hasVi(text) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text || ""));
}

function isBadVi(vi, word) {
  const v = String(vi || "").trim();
  if (!v) return true;
  if (/^nghĩa tiếng việt của từ/i.test(v)) return true;
  if (v.toLowerCase() === word.toLowerCase()) return true;
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const src = fs.readFileSync(target, "utf8");
const json = src.replace(/^[\s\S]*?export default /, "").replace(/;\s*$/, "");
const meta = JSON.parse(json);

async function main() {
  const bad = Object.keys(meta).filter((w) => isBadVi(meta[w].vi, w));
  console.log("Fixing", bad.length, "words...");
  let fixed = 0;
  for (const word of bad) {
    let vi = await translateWithMyMemoryPublicApi(word);
    await sleep(250);
    if (!hasVi(vi) || isBadVi(vi, word)) {
      vi = await translateWithMyMemoryPublicApi(`English word: ${word}`);
      await sleep(250);
    }
    if (hasVi(vi) && !isBadVi(vi, word)) {
      meta[word].vi = vi;
      fixed += 1;
    }
    if (fixed % 30 === 0 && fixed > 0) console.log("fixed", fixed);
  }
  fs.writeFileSync(
    target,
    `/** Auto-generated — npm run build:story-vocab */\nexport default ${JSON.stringify(meta, null, 2)};\n`
  );
  console.log("Done. Fixed", fixed, "of", bad.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
