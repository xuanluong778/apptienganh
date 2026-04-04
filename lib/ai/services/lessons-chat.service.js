import { getSettingSync } from "@/lib/runtime-settings/cache";
import { getLessonsTutorSystemPrompt } from "../prompts/lessons-tutor";
import { openaiChatCompletions } from "../providers/openai";
import { MODEL_TIER, resolveLessonsChatTier, resolveModelForTier } from "../model-router";
import { sanitizeHistory } from "../utils/sanitize-history";

function parseLessonsJsonContent(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return {
      reply: String(parsed.reply || "").trim(),
      corrected_sentence: String(parsed.corrected_sentence || "").trim(),
      ipa: String(parsed.ipa || "").trim(),
      pronunciation_tip: String(parsed.pronunciation_tip || "").trim(),
      mistakes_explanation: String(parsed.mistakes_explanation || "").trim(),
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ message: string, history: Array, vipPriority?: boolean }} params
 * @returns {Promise<object|null>} structured tutor payload or null when AI unavailable
 */
export async function generateLessonsChatReply({ message, history = [], vipPriority = false }) {
  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey) return null;

  const historyMessages = sanitizeHistory(history).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const tier = vipPriority
    ? MODEL_TIER.STANDARD
    : resolveLessonsChatTier({
        message,
        historyLength: historyMessages.length,
      });
  const model = resolveModelForTier(tier);
  const max_tokens = vipPriority ? 650 : 500;

  const result = await openaiChatCompletions({
    model,
    temperature: 0.65,
    max_tokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: getLessonsTutorSystemPrompt() },
      ...historyMessages,
      { role: "user", content: String(message || "") },
    ],
  });

  if (!result.ok) return null;
  const parsed = parseLessonsJsonContent(result.data.content);
  if (!parsed?.reply) return null;
  return parsed;
}
