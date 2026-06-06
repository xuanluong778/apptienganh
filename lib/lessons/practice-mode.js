export const PRACTICE_MODES = [
  {
    id: "free_talk",
    label: "Free Talk",
    shortLabel: "Talk",
    hint: "Chat naturally — one question at a time.",
  },
  {
    id: "vocabulary_practice",
    label: "Vocabulary Practice",
    shortLabel: "Vocab",
    hint: "Use lesson words and ask kids to make sentences.",
  },
  {
    id: "story_questions",
    label: "Story Questions",
    shortLabel: "Story",
    hint: "Simple questions about a story the child knows.",
  },
];

export function normalizePracticeMode(mode) {
  const value = String(mode || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (value === "vocabulary_practice" || value === "vocabulary") return "vocabulary_practice";
  if (value === "story_questions" || value === "story") return "story_questions";
  return "free_talk";
}

export function getPracticeModeMeta(mode) {
  const id = normalizePracticeMode(mode);
  return PRACTICE_MODES.find((m) => m.id === id) || PRACTICE_MODES[0];
}
