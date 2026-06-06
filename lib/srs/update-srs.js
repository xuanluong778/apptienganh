const LEVEL_DELAYS_DAYS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

function clampLevel(n) {
  const x = Number.isFinite(n) ? Math.floor(n) : 0;
  return Math.max(0, Math.min(5, x));
}

function addDays(date, days) {
  const ms = Number(days) * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

/**
 * updateSRS(progress, isCorrect)
 * Rules:
 * - Wrong → mastery_level = 0, next_review = +1 day
 * - Correct → increase level:
 *   0→1 (1d), 1→2 (3d), 2→3 (7d), 3→4 (14d), 4→5 (30d)
 */
export function updateSRS(progress, isCorrect) {
  const now = new Date();
  const currentLevel = clampLevel(progress?.mastery_level ?? 0);
  const currentStreak = Number(progress?.correct_streak ?? 0) || 0;
  const currentWrong = Number(progress?.wrong_count ?? 0) || 0;

  if (!isCorrect) {
    return {
      mastery_level: 0,
      correct_streak: 0,
      wrong_count: currentWrong + 1,
      last_reviewed_at: now,
      next_review_at: addDays(now, 1),
    };
  }

  const nextLevel = clampLevel(currentLevel + 1);
  const delayDays = LEVEL_DELAYS_DAYS[nextLevel] || 1;
  return {
    mastery_level: nextLevel,
    correct_streak: currentStreak + 1,
    wrong_count: currentWrong,
    last_reviewed_at: now,
    next_review_at: addDays(now, delayDays),
  };
}

