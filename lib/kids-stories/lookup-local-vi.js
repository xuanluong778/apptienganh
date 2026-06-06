import vocabMeta from "./story-vocab-meta.generated.js";
import choBeStories from "./cho-be-stories.generated.json";
import { VI_OVERRIDES } from "./story-vi-overrides.js";

export function cleanStoryVi(vi, word = "") {
  const v = String(vi || "").trim();
  const key = String(word || "").toLowerCase();
  if (!v || v.toLowerCase() === key) return "";
  if (/MYMEMORY WARNING|quota exceeded|invalid|nghĩa tiếng việt của từ/i.test(v)) return "";
  if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(v)) return "";
  return v;
}

/** Từ vựng gợi ý trong 30 truyện cho bé → nghĩa Việt (nếu có trong meta/override). */
const CHO_BE_VOCAB_VI = (() => {
  const map = new Map();
  for (const story of choBeStories) {
    for (const raw of story.vocabularyWords || []) {
      const key = String(raw || "").toLowerCase().trim();
      if (!key || map.has(key)) continue;
      const vi = VI_OVERRIDES[key] || cleanStoryVi(vocabMeta[key]?.vi, key);
      if (vi) map.set(key, vi);
    }
  }
  return map;
})();

/** Tra nghĩa Việt offline (override + meta đã build). */
export function lookupLocalVi(lemma) {
  const key = String(lemma || "").toLowerCase().trim();
  if (!key) return "";
  if (VI_OVERRIDES[key]) return VI_OVERRIDES[key];
  if (CHO_BE_VOCAB_VI.has(key)) return CHO_BE_VOCAB_VI.get(key);
  return cleanStoryVi(vocabMeta[key]?.vi, key);
}

export function lookupLocalPhonetic(lemma) {
  const key = String(lemma || "").toLowerCase().trim();
  return String(vocabMeta[key]?.phonetic || "").trim();
}
