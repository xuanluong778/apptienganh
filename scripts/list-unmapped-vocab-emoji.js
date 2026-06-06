const fs = require("fs");
const path = require("path");

const utilsPath = path.join(__dirname, "../lib/kids-vocabulary/utils.js");
const utilsSrc = fs.readFileSync(utilsPath, "utf8");
const mapMatch = utilsSrc.match(/WORD_TO_TWEMOJI_HEX = \{([\s\S]*?)\};/);
const keys = new Set();
if (mapMatch) {
  for (const m of mapMatch[1].matchAll(/^\s*([a-z0-9_]+):/gm)) keys.add(m[1]);
}

const stories = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../lib/kids-stories/docx-stories.generated.json"), "utf8")
);
const words = new Set();
for (const st of stories) {
  for (const w of st.vocabularyWords || []) words.add(String(w).toLowerCase().trim());
}

const missing = [...words].filter((w) => !keys.has(w)).sort();
console.log("mapped", keys.size, "story words", words.size, "missing", missing.length);
console.log(missing.slice(0, 80).join(", "));
