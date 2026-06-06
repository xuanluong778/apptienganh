import { getSettingSync } from "@/lib/runtime-settings/cache";
import { getLessonsTutorSystemPrompt } from "../prompts/lessons-tutor";
import { openaiChatCompletions } from "../providers/openai";
import { MODEL_TIER, resolveLessonsChatTier, resolveModelForTier } from "../model-router";
import { sanitizeHistory } from "../utils/sanitize-history";

export function sanitizeUserInput(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  // Block common prompt-injection directives (only when they start the message).
  // This avoids breaking normal sentences like "I think you're right."
  if (
    /^(you are\b|you're\b|act as\b|system:\b|ignore previous\b|ignore this instruction\b)/i.test(raw)
  ) {
    return "";
  }
  return raw;
}

function safeBlockedPromptReply() {
  return {
    reply: "Please tell me one simple sentence about your day in English.",
    corrected_sentence: "",
    ipa: "",
    pronunciation_tip: "Speak slowly and clearly.",
    mistakes_explanation: "I can’t respond to instruction-like prompts. Please send a normal English sentence to practice.",
  };
}

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
 * @param {{
 *   message: string,
 *   history: Array,
 *   vipPriority?: boolean,
 *   practiceMode?: string,
 *   vocabularyWords?: string[],
 *   languageSupportMode?: string,
 *   selectedTeacher?: string,
 * }} params
 * @returns {Promise<object|null>} structured tutor payload or null when AI unavailable
 */
export async function generateLessonsChatReply({
  message,
  history = [],
  vipPriority = false,
  practiceMode = "free_talk",
  vocabularyWords = [],
  languageSupportMode = "english_vietnamese_help",
  selectedTeacher = "teacher_bunny",
}) {
  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey) return null;

  const cleanHistory = sanitizeHistory(history).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const tier = vipPriority
    ? MODEL_TIER.STANDARD
    : resolveLessonsChatTier({
        message,
        historyLength: cleanHistory.length,
      });
  const model = resolveModelForTier(tier);
  const max_tokens = vipPriority ? 650 : 500;

  const userInput = sanitizeUserInput(message);
  if (!userInput) return safeBlockedPromptReply();

  const systemPrompt = getLessonsTutorSystemPrompt({
    practiceMode,
    vocabularyWords,
    languageSupportMode,
    selectedTeacher,
  });
  const messages = [
    { role: "system", content: systemPrompt },
    ...cleanHistory,
    { role: "user", content: userInput },
  ];

  const result = await openaiChatCompletions({
    model,
    temperature: 0.65,
    max_tokens,
    response_format: { type: "json_object" },
    messages,
  });

  if (!result.ok) return null;
  const parsed = parseLessonsJsonContent(result.data.content);
  if (!parsed?.reply) return null;
  return parsed;
}
