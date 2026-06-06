/**
 * Sinh story-word-pictogram.generated.js từ API ARASAAC.
 * Chạy: npm run build:word-pictogram
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pickArasaacPictogramId } from "../lib/kids-vocabulary/word-pictogram-lookup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const API = "https://api.arasaac.org/v1/pictograms/en/search";
const DELAY_MS = 70;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stems(word) {
  const w = word.toLowerCase();
  const out = [w];
  if (w.endsWith("ies")) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ing") && w.length > 4) out.push(w.slice(0, -3));
  if (w.endsWith("ed") && w.length > 3) out.push(w.slice(0, -2));
  if (w.endsWith("es") && w.length > 3) out.push(w.slice(0, -2));
  if (w.endsWith("s") && w.length > 2) out.push(w.slice(0, -1));
  return [...new Set(out)];
}

async function searchPictogramId(word) {
  for (const variant of stems(word)) {
    try {
      const res = await fetch(`${API}/${encodeURIComponent(variant)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const items = await res.json();
      const id = pickArasaacPictogramId(items, word);
      if (id) return id;
    } catch {
      /* thử stem tiếp */
    }
    await sleep(DELAY_MS);
  }
  return null;
}

const words = new Set();
for (const file of ["docx-stories.generated.json", "cho-be-stories.generated.json"]) {
  const p = path.join(root, "lib/kids-stories", file);
  if (!fs.existsSync(p)) continue;
  const stories = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const st of stories) {
    for (const w of st.vocabularyWords || []) words.add(String(w).toLowerCase().trim());
  }
}

const list = [...words].filter(Boolean).sort();
const out = {};
let ok = 0;
let miss = 0;

console.log(`Fetching ${list.length} words from ARASAAC…`);

for (let i = 0; i < list.length; i += 1) {
  const w = list[i];
  const id = await searchPictogramId(w);
  if (id) {
    out[w] = id;
    ok += 1;
  } else {
    miss += 1;
  }
  if ((i + 1) % 25 === 0 || i === list.length - 1) {
    console.log(`  ${i + 1}/${list.length} — mapped ${ok}, missing ${miss}`);
  }
  await sleep(DELAY_MS);
}

const target = path.join(root, "lib/kids-vocabulary/story-word-pictogram.generated.js");
const lines = [
  "/** Auto-generated — chạy: npm run build:word-pictogram */",
  `export default ${JSON.stringify(out, null, 2)};`,
  "",
];
fs.writeFileSync(target, lines.join("\n"));
console.log(`Wrote ${Object.keys(out).length} pictograms →`, target);
