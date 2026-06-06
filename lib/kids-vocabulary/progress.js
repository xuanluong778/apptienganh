/**
 * Progress + SRS đơn giản (1 / 3 / 7 ngày) — lưu localStorage, không cần đăng nhập.
 * Từ hay sai được ôn nhiều hơn qua trọng số trong pickReviewWords.
 */

const STORAGE_KEY = "kids_vocab_progress_v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const SRS_STEPS = [1, 3, 7]; // ngày

function safeParse(raw) {
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function loadAllProgress() {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY) || "{}");
}

export function saveAllProgress(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  try {
    window.dispatchEvent(new Event("kids_vocab_progress"));
  } catch (_e) {}
}

export function getWordProgress(wordId) {
  const all = loadAllProgress();
  const w = all[wordId];
  if (!w || typeof w !== "object") {
    return {
      correct: 0,
      wrong: 0,
      lastSeen: 0,
      nextReview: 0,
      srsStep: 0,
    };
  }
  return {
    correct: Number(w.correct) || 0,
    wrong: Number(w.wrong) || 0,
    lastSeen: Number(w.lastSeen) || 0,
    nextReview: Number(w.nextReview) || 0,
    srsStep: Math.min(SRS_STEPS.length - 1, Math.max(0, Number(w.srsStep) || 0)),
  };
}

export function masteryPercent(wordId) {
  const { correct, wrong } = getWordProgress(wordId);
  const t = correct + wrong;
  if (t === 0) return 0;
  return Math.round((100 * correct) / t);
}

/** Đúng: +SRS, sai: reset SRS nhẹ, vẫn cho thử lại trong game (không phạt nặng ở đây). */
export function recordCorrect(wordId) {
  const all = loadAllProgress();
  const cur = getWordProgress(wordId);
  const nextStep = Math.min(SRS_STEPS.length - 1, cur.srsStep + (cur.correct > 0 ? 1 : 0));
  const days = SRS_STEPS[nextStep] ?? 7;
  const nextReview = Date.now() + days * DAY_MS;
  all[wordId] = {
    ...cur,
    correct: cur.correct + 1,
    lastSeen: Date.now(),
    srsStep: cur.wrong > cur.correct ? cur.srsStep : nextStep,
    nextReview,
  };
  saveAllProgress(all);
}

export function recordWrong(wordId) {
  const all = loadAllProgress();
  const cur = getWordProgress(wordId);
  all[wordId] = {
    ...cur,
    wrong: cur.wrong + 1,
    lastSeen: Date.now(),
    srsStep: 0,
    nextReview: Date.now() + DAY_MS,
  };
  saveAllProgress(all);
}

/** Ưu tiên từ due SRS, sau đó từ wrong/correct cao. */
export function pickReviewWords(wordIds, take = 6) {
  const now = Date.now();
  const scored = wordIds.map((id) => {
    const p = getWordProgress(id);
    const due = p.nextReview && p.nextReview <= now ? 1000 : 0;
    const weakness = p.wrong * 50 - p.correct * 5;
    return { id, score: due + weakness + Math.random() * 3 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, take).map((s) => s.id);
}

export function lessonCompletionCount(lessonId, wordIds) {
  const all = loadAllProgress();
  let done = 0;
  for (const id of wordIds) {
    const p = all[id];
    if (p && Number(p.correct) >= 2) done += 1;
  }
  return done;
}
