import { kidWordAudioUrl, kidWordImageUrl } from "@/lib/kids-vocabulary/utils";
import rawStories from "./docx-stories.generated.json";
import sentenceViCache from "./docx-sentence-vi-cache.generated.json";
import vocabMeta from "./story-vocab-meta.generated.js";
import { splitStoryTitle } from "./split-story-title";

function cleanVi(vi, word) {
  const v = String(vi || "").trim();
  const key = String(word || "").toLowerCase();
  if (!v || v.toLowerCase() === key) return "";
  if (/MYMEMORY WARNING|nghĩa tiếng việt của từ/i.test(v)) return "";
  if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(v)) return "";
  return v;
}

function vocab(storyId, word) {
  const key = String(word || "").toLowerCase().trim();
  const meta = vocabMeta[key] || {};
  const vi = cleanVi(meta.vi, key);
  return {
    id: `${storyId}:${word}`,
    word,
    phonetic: String(meta.phonetic || "").trim(),
    vietnameseMeaning: vi,
    imageUrl: kidWordImageUrl(word),
    audioUrl: kidWordAudioUrl(word),
  };
}

const VI_RE_BROKEN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function patchQuestions(questions, titleEn, titleVi) {
  if (!Array.isArray(questions)) return questions;
  return questions.map((q) => {
    if (!q?.options?.length) return q;
    const opts = [...q.options];
    if (q.id === "q1" && opts[0] && (VI_RE_BROKEN.test(opts[0]) || opts[0].includes(titleEn.slice(0, 8)))) {
      opts[0] = titleEn;
    }
    if (q.id === "q2" && opts[0]) {
      opts[0] = titleVi || titleEn;
    }
    return { ...q, options: opts };
  });
}

function resolveTitleVi(titleEn, titleVi) {
  if (titleVi && titleVi !== titleEn && VI_RE_BROKEN.test(titleVi)) return titleVi;
  const cached = sentenceViCache[`__title__:${titleEn}`] || sentenceViCache[titleEn];
  if (cached && VI_RE_BROKEN.test(cached)) return cached;
  return titleVi || titleEn;
}

function hydrateParagraphs(paragraphs) {
  return (paragraphs || []).map((p) => {
    const en = String(p.en || "").trim();
    let vi = String(p.vi || "").trim();
    if (!vi && en && sentenceViCache[en]) vi = sentenceViCache[en];
    return { en, vi };
  });
}

function hydrateStory(raw) {
  const vocabulary = (raw.vocabularyWords || []).map((w) => vocab(raw.id, w));
  const { titleEn, titleVi } = splitStoryTitle(raw.titleEn, raw.titleVi);
  const titleViResolved = resolveTitleVi(titleEn, titleVi);
  return {
    id: raw.id,
    titleEn,
    titleVi: titleViResolved,
    emoji: raw.emoji || "📖",
    color: raw.color || "#ffd166",
    paragraphs: hydrateParagraphs(raw.paragraphs),
    vocabulary,
    questions: patchQuestions(raw.questions, titleEn, titleViResolved),
    games: raw.games,
  };
}

export const DOCX_STORIES = rawStories.map(hydrateStory);
