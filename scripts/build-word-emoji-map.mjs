/**
 * Sinh story-word-emoji.generated.js
 * Chạy: npm run build:word-emoji
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const { resolveWordEmojiHex } = await import(`file://${path.join(root, "lib/kids-vocabulary/word-emoji-lookup.js")}`);

const words = new Set();
for (const file of ["docx-stories.generated.json", "cho-be-stories.generated.json"]) {
  const p = path.join(root, "lib/kids-stories", file);
  if (!fs.existsSync(p)) continue;
  const stories = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const st of stories) {
    for (const w of st.vocabularyWords || []) words.add(String(w).toLowerCase().trim());
  }
}

const out = {};
for (const w of words) {
  const hex = resolveWordEmojiHex(w);
  if (hex && hex !== "1f4d0") out[w] = hex;
}

const lines = [
  "/** Auto-generated — chạy: npm run build:word-emoji */",
  `export default ${JSON.stringify(out, null, 2)};`,
  "",
];
const target = path.join(root, "lib/kids-vocabulary/story-word-emoji.generated.js");
fs.writeFileSync(target, lines.join("\n"));
console.log("Wrote", Object.keys(out).length, "emoji overrides →", target);
