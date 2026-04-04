import { buildFallbackReply } from "../fallback/lessons-chat-fallback";

/**
 * Post-AI guardrails (still prompt/LLM domain, not HTTP).
 */
export function finalizeLessonsChatPayload(aiPayload, userMessage) {
  const base = aiPayload || buildFallbackReply(userMessage);
  const aiReply = String(base.reply || "").trim();
  const msg = String(userMessage || "").trim();
  const looksLikeParrot =
    /\b(you said|great job|great try|corrected:|as you said)\b/i.test(aiReply) ||
    (aiReply.length < 12 && aiReply.toLowerCase() === msg.toLowerCase());
  return looksLikeParrot ? buildFallbackReply(userMessage) : base;
}
