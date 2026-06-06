/** Chuẩn hóa token truyện để tra từ vựng / từ điển. */
import { lookupLocalPhonetic, lookupLocalVi } from "./lookup-local-vi";

export function normalizeStoryWord(raw) {
  return String(raw || "")
    .replace(/^[^a-zA-ZÀ-ỹ0-9'-]+|[^a-zA-ZÀ-ỹ0-9'-]+$/g, "")
    .toLowerCase();
}

export function buildVocabMap(vocabulary = []) {
  const map = new Map();
  for (const item of vocabulary) {
    const key = normalizeStoryWord(item?.word);
    if (key) map.set(key, item);
  }
  return map;
}

const LOOKUP_CACHE_VER = 5;
const lookupCache = new Map();

function cacheKey(lemma) {
  return `${LOOKUP_CACHE_VER}:${lemma}`;
}

function hasVietnamese(text, enWord = "", definition = "") {
  const vi = String(text || "").trim();
  if (!vi) return false;
  const low = vi.toLowerCase();
  const en = String(enWord || "").trim().toLowerCase();
  const def = String(definition || "").trim().toLowerCase();
  if (en && low === en) return false;
  if (def && low === def) return false;
  if (/MYMEMORY WARNING|quota exceeded|invalid/i.test(vi)) return false;
  if (/^[a-z][a-z\s'.,-]{0,120}$/i.test(vi) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(vi)) {
    return false;
  }
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(vi)) return true;
  if (def && low !== def && vi.length <= 160) return true;
  return false;
}

async function fetchMeaningVi(word, definition) {
  const w = String(word || "").trim();
  if (!w) return "";
  const params = new URLSearchParams({ word: w, def: String(definition || "").trim() });
  try {
    const res = await fetch(`/api/dictionary/meaning-vi?${params}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success) {
      return String(json.data?.meaningVi || "").trim();
    }
  } catch (_e) {
    /* bỏ qua */
  }
  return "";
}

async function fetchDictionary(lemma) {
  if (lemma.length < 2) return null;
  const res = await fetch(`/api/dictionary/lookup?q=${encodeURIComponent(lemma)}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success || !json?.data) return null;
  return json.data;
}

function buildInfo({ word, phonetic, meaning, audioUrl, definition }) {
  return {
    word,
    phonetic: phonetic || "",
    meaning: meaning || "",
    audioUrl: audioUrl || "",
    definition: definition || "",
  };
}

/**
 * @returns {Promise<{ word: string, phonetic: string, meaning: string, audioUrl?: string, definition?: string }|null>}
 */
export async function resolveStoryWord(rawToken, vocabMap) {
  const lemma = normalizeStoryWord(rawToken);
  if (!lemma || lemma.length < 2) return null;

  const key = cacheKey(lemma);
  if (lookupCache.has(key)) return lookupCache.get(key);

  const localVi = lookupLocalVi(lemma);
  const localPhonetic = lookupLocalPhonetic(lemma);
  const fromVocab = vocabMap?.get?.(lemma);

  const wordLabel = fromVocab?.word || lemma;
  const phonetic = fromVocab?.phonetic || localPhonetic || "";
  const audioUrl = fromVocab?.audioUrl || "";

  const vocabVi = fromVocab?.vietnameseMeaning || "";
  let meaning =
    (hasVietnamese(vocabVi, lemma, "") && vocabVi) ||
    (hasVietnamese(localVi, lemma, "") && localVi) ||
    "";

  const dict = await fetchDictionary(lemma);
  const word = dict?.word || wordLabel;
  const definition = dict?.definition || "";
  const dictPhonetic = dict?.phonetic || phonetic;
  const dictAudio = dict?.audio || audioUrl;

  if (!meaning && dict?.meaningVi) {
    const mv = String(dict.meaningVi).trim();
    if (hasVietnamese(mv, word, definition)) meaning = mv;
  }
  if (!meaning) meaning = lookupLocalVi(lemma);
  if (!meaning) meaning = await fetchMeaningVi(word, definition);
  if (!meaning && !dict) meaning = await fetchMeaningVi(wordLabel, "");

  if (!hasVietnamese(meaning, word, definition)) {
    lookupCache.set(key, null);
    return null;
  }

  const info = buildInfo({
    word,
    phonetic: dictPhonetic,
    meaning,
    audioUrl: dictAudio,
    definition,
  });
  lookupCache.set(key, info);
  return info;
}
