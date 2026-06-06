import { normalizeLanguageSupportMode } from "@/lib/lessons/language-support-mode";
import { hasVietnameseForTts } from "@/lib/vbee/prepare-vietnamese-tts-text";

const SHORT_GREETING_RE =
  /^(hello|hi|hey|yes|no|ok|okay|thanks|thank you|good morning|good night)[!.?\s]*$/i;

export function isShortKidGreeting(message) {
  const m = String(message || "").trim();
  if (!m) return false;
  if (SHORT_GREETING_RE.test(m)) return true;
  const words = m.split(/\s+/).filter(Boolean);
  return words.length <= 2 && SHORT_GREETING_RE.test(words.join(" "));
}

function normalizeForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sentencesRoughlyMatch(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function replyAlreadyHasCorrection(reply, correctedSentence) {
  const corrected = normalizeForCompare(correctedSentence);
  if (!corrected) return false;
  const r = normalizeForCompare(reply);
  return r.includes(corrected);
}

export function userNeedsCorrection(userMessage, correctedSentence) {
  const corrected = String(correctedSentence || "").trim();
  const user = String(userMessage || "").trim();
  if (!corrected || !user) return false;
  if (sentencesRoughlyMatch(user, corrected)) return false;
  if (isShortKidGreeting(user)) {
    const userWords = normalizeForCompare(user);
    const corrWords = normalizeForCompare(corrected);
    if (userWords === corrWords) return false;
    if (corrWords.split(" ").length > 6) return false;
  }
  return true;
}

export function sanitizeVietnameseHelp(text, languageSupportMode) {
  const mode = normalizeLanguageSupportMode(languageSupportMode);
  const t = String(text || "").trim();
  if (!t) return "";
  if (mode === "english_only") return t;
  if (hasVietnameseForTts(t)) return t;
  return "";
}

export function ensureSingleFollowUpQuestion(reply) {
  const text = String(reply || "").trim();
  if (!text) return text;
  const firstQ = text.indexOf("?");
  if (firstQ === -1) return text;
  const secondQ = text.indexOf("?", firstQ + 1);
  if (secondQ === -1) return text;
  return text.slice(0, firstQ + 1).trim();
}

export function bubbleHasKidDetails(message, languageSupportMode, userMessage) {
  const showViHelp = normalizeLanguageSupportMode(languageSupportMode) !== "english_only";
  const showBetter =
    userNeedsCorrection(userMessage, message.correctedSentence) &&
    !replyAlreadyHasCorrection(message.text, message.correctedSentence);

  return Boolean(
    showBetter ||
      message.ipa ||
      message.tip ||
      (showViHelp && message.mistakesExplanation)
  );
}

export function shouldShowBetterSentence(message, userMessage) {
  return (
    userNeedsCorrection(userMessage, message.correctedSentence) &&
    !replyAlreadyHasCorrection(message.text, message.correctedSentence)
  );
}
