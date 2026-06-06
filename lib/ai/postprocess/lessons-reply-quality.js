import { buildFallbackReply } from "../fallback/lessons-chat-fallback";
import {
  ensureSingleFollowUpQuestion,
  isShortKidGreeting,
  replyAlreadyHasCorrection,
  sanitizeVietnameseHelp,
  userNeedsCorrection,
} from "@/lib/lessons/kids-chat-display";
import { normalizeLanguageSupportMode } from "@/lib/lessons/language-support-mode";

function defaultVietnameseHelpForGreeting(userMessage) {
  const m = String(userMessage || "").trim().toLowerCase();
  if (/^(hi|hello|hey)\b/.test(m)) {
    return '"Hello" nghĩa là "Xin chào".';
  }
  if (/^yes\b/.test(m)) return '"Yes" nghĩa là "Vâng" hoặc "Có".';
  if (/^no\b/.test(m)) return '"No" nghĩa là "Không".';
  return "";
}

function applyKidsReplyRules(base, userMessage, languageSupportMode) {
  const mode = normalizeLanguageSupportMode(languageSupportMode);
  const msg = String(userMessage || "").trim();

  let reply = ensureSingleFollowUpQuestion(String(base.reply || "").trim());
  let corrected = String(base.corrected_sentence || "").trim();
  let ipa = String(base.ipa || "").trim();
  let tip = String(base.pronunciation_tip || "").trim();
  let mistakes = sanitizeVietnameseHelp(base.mistakes_explanation, languageSupportMode);

  if (isShortKidGreeting(msg)) {
    ipa = "";
    tip = "";
    if (!userNeedsCorrection(msg, corrected)) {
      corrected = "";
    }
    if (mode !== "english_only" && !mistakes) {
      mistakes = defaultVietnameseHelpForGreeting(msg);
    }
  }

  if (!userNeedsCorrection(msg, corrected) || replyAlreadyHasCorrection(reply, corrected)) {
    corrected = "";
  }

  if (msg.split(/\s+/).filter(Boolean).length <= 2 && ipa.length > 36) {
    ipa = "";
  }

  if (mode !== "english_only" && mistakes && !sanitizeVietnameseHelp(mistakes, languageSupportMode)) {
    mistakes = "";
  }

  return {
    ...base,
    reply,
    corrected_sentence: corrected,
    ipa,
    pronunciation_tip: tip,
    mistakes_explanation: mistakes,
  };
}

/**
 * Post-AI guardrails for kids chat (ages 4–10).
 */
export function finalizeLessonsChatPayload(aiPayload, userMessage, options = {}) {
  const { languageSupportMode = "english_vietnamese_help" } = options;
  const base = aiPayload || buildFallbackReply(userMessage);
  const aiReply = String(base.reply || "").trim();
  const msg = String(userMessage || "").trim();
  const looksLikeParrot =
    /\b(you said|great job|great try|corrected:|as you said)\b/i.test(aiReply) ||
    (aiReply.length < 12 && aiReply.toLowerCase() === msg.toLowerCase());

  const chosen = looksLikeParrot ? buildFallbackReply(userMessage) : base;
  return applyKidsReplyRules(chosen, userMessage, languageSupportMode);
}
