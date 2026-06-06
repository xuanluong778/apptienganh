import { kidWordAudioUrl, kidWordImageUrl } from "@/lib/kids-vocabulary/utils";
import rawStories from "./cau-truyen-stories.generated.json";
import vocabMeta from "./story-vocab-meta.generated.js";
import { lookupLocalPhonetic, lookupLocalVi } from "./lookup-local-vi";

function cleanVi(vi, word) {
  const v = String(vi || "").trim();
  const key = String(word || "").toLowerCase();
  if (!v || v.toLowerCase() === key) return "";
  if (/MYMEMORY WARNING|nghĩa tiếng việt của từ/i.test(v)) return "";
  if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(v)) return "";
  return v;
}

function vocab(storyId, word, inlineVi = "") {
  const key = String(word || "").toLowerCase().trim();
  const meta = vocabMeta[key] || {};
  const vi = cleanVi(inlineVi, key) || cleanVi(meta.vi, key) || lookupLocalVi(key);
  return {
    id: `${storyId}:${word}`,
    word,
    phonetic: String(meta.phonetic || "").trim() || lookupLocalPhonetic(key),
    vietnameseMeaning: vi,
    imageUrl: kidWordImageUrl(word),
    audioUrl: kidWordAudioUrl(word),
  };
}

function hydrateStory(raw) {
  const inlineMeanings = raw.vocabMeanings || {};
  const vocabulary = (raw.vocabularyWords || []).map((w) =>
    vocab(raw.id, w, inlineMeanings[w] || inlineMeanings[w?.toLowerCase?.()] || "")
  );
  return {
    id: raw.id,
    num: raw.num,
    titleEn: raw.titleEn,
    titleVi: raw.titleVi,
    emoji: raw.emoji || "😄",
    color: raw.color || "#ffd166",
    paragraphs: raw.paragraphs,
    vocabulary,
    questions: raw.questions,
    games: raw.games,
    listCategory: "cuoi",
  };
}

export const CAU_TRUYEN_STORIES = rawStories.map(hydrateStory);
