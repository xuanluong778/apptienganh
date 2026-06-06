/**
 * Sinh IPA + nghĩa tiếng Việt cho từ vựng truyện.
 * Chạy: npm run build:story-vocab
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveIpa, resolveIpaFull, lemmaCandidates } from "../lib/kids-stories/ipa-lookup.mjs";
import { translateWithMyMemoryPublicApi } from "../lib/ai/providers/mymemory-translate.js";
import { VI_OVERRIDES } from "../lib/kids-stories/story-vi-overrides.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function hasVi(text) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text || ""));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateWordVi(word) {
  if (VI_OVERRIDES[word]) return VI_OVERRIDES[word];
  const vi = await translateWithMyMemoryPublicApi(`nghĩa tiếng Việt của từ "${word}"`);
  if (hasVi(vi) && vi.toLowerCase() !== word) return vi;
  return "";
}

async function mapPool(items, fn, concurrency = 6) {
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

async function main() {
  const storyFiles = [
    "lib/kids-stories/docx-stories.generated.json",
    "lib/kids-stories/cho-be-stories.generated.json",
  ];
  const words = new Set();
  for (const rel of storyFiles) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const stories = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const st of stories) {
      for (const w of st.vocabularyWords || []) words.add(String(w).toLowerCase().trim());
    }
  }
  const sorted = [...words].sort();
  console.log("Words:", sorted.length);

  const meta = {};
  for (const word of sorted) {
    let phonetic = resolveIpa(word);
    meta[word] = { phonetic: phonetic || "", vi: VI_OVERRIDES[word] || "" };
  }

  const needDictIpa = sorted.filter((w) => !meta[w].phonetic);
  console.log("CMU IPA ok:", sorted.length - needDictIpa.length, "need dictionary:", needDictIpa.length);

  await mapPool(
    needDictIpa,
    async (word) => {
      for (const lemma of lemmaCandidates(word)) {
        const ipa = await resolveIpaFull(lemma);
        if (ipa) {
          meta[word].phonetic = ipa;
          return;
        }
      }
    },
    8
  );

  const needVi = sorted.filter((w) => !meta[w].vi);
  console.log("VI overrides:", sorted.length - needVi.length, "need translate:", needVi.length);

  await mapPool(
    needVi,
    async (word) => {
      const vi = await translateWordVi(word);
      meta[word].vi = vi || word;
      await sleep(200);
    },
    4
  );

  const target = path.join(root, "lib/kids-stories/story-vocab-meta.generated.js");
  fs.writeFileSync(
    target,
    `/** Auto-generated — npm run build:story-vocab */\nexport default ${JSON.stringify(meta, null, 2)};\n`
  );
  console.log("Done →", target);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
