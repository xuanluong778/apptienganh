export const LANGUAGE_SUPPORT_MODES = [
  {
    id: "english_vietnamese_help",
    label: "English + Vietnamese Help",
    shortLabel: "EN+VI",
    hint: "AI speaks English; short Vietnamese only when correcting or explaining.",
  },
  {
    id: "beginner_vietnamese_support",
    label: "Beginner Vietnamese Support",
    shortLabel: "Beginner",
    hint: "Simple English first, then a short Vietnamese explanation for new learners.",
  },
  {
    id: "english_only",
    label: "English Only",
    shortLabel: "EN only",
    hint: "AI replies in English only — use Translate for Vietnamese.",
  },
];

export const DEFAULT_LANGUAGE_SUPPORT_MODE = "english_vietnamese_help";

export function normalizeLanguageSupportMode(mode) {
  const value = String(mode || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (value === "english_only" || value === "englishonly" || value === "en_only") {
    return "english_only";
  }
  if (
    value === "beginner_vietnamese_support" ||
    value === "beginner_vietnamese" ||
    value === "beginner_vi"
  ) {
    return "beginner_vietnamese_support";
  }
  if (
    value === "english_vietnamese_help" ||
    value === "english_vietnamese" ||
    value === "bilingual" ||
    value === "vi_help"
  ) {
    return "english_vietnamese_help";
  }
  if (!value) return DEFAULT_LANGUAGE_SUPPORT_MODE;
  return DEFAULT_LANGUAGE_SUPPORT_MODE;
}

export function usesVietnameseHelpField(mode) {
  const id = normalizeLanguageSupportMode(mode);
  return id === "english_vietnamese_help" || id === "beginner_vietnamese_support";
}
