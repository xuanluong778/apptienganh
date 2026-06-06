import { getSettingSync } from "@/lib/runtime-settings/cache";
import { clientEvaluateSpeech } from "@/lib/ai-call/client-evaluate-fallback";
import { openaiChatCompletions } from "../providers/openai";
import { getAiCallEvaluateSystemPrompt } from "../prompts/ai-call-evaluate";
import { sanitizeHistory } from "../utils/sanitize-history";
import { MODEL_TIER, resolveModelForTier } from "../model-router";

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 70;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function parseEvaluateJson(content) {
  if (!content) return null;
  try {
    const p = JSON.parse(content);
    const why = Array.isArray(p.why_wrong)
      ? p.why_wrong.map((x) => String(x || "").trim()).filter(Boolean)
      : p.why_wrong
      ? [String(p.why_wrong).trim()]
      : [];
    const scores = p.scores && typeof p.scores === "object" ? p.scores : {};
    return {
      is_correct: Boolean(p.is_correct),
      you_said: String(p.you_said || "").trim(),
      correct_sentence: String(p.correct_sentence || "").trim(),
      why_wrong: why,
      say_again: String(p.say_again || p.correct_sentence || "").trim(),
      teacher_reply: String(p.teacher_reply || "").trim(),
      scores: {
        pronunciation: clampScore(scores.pronunciation),
        grammar: clampScore(scores.grammar),
        naturalness: clampScore(scores.naturalness),
      },
      next_prompt: String(p.next_prompt || "").trim(),
    };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   spokenText: string,
 *   targetSentence?: string,
 *   lessonContext?: string,
 *   level?: string,
 *   history?: Array,
 * }} params
 */
export async function evaluateAiCallSpeech({
  spokenText,
  targetSentence = "",
  lessonContext = "",
  level = "A1",
  history = [],
}) {
  const said = String(spokenText || "").trim();
  if (!said) {
    return {
      is_correct: false,
      you_said: "",
      correct_sentence: targetSentence,
      why_wrong: ["Không nghe thấy giọng nói — hãy bấm micro và nói rõ hơn."],
      say_again: targetSentence,
      teacher_reply: "I didn't hear you. Please try again.",
      scores: { pronunciation: 0, grammar: 0, naturalness: 0 },
      next_prompt: targetSentence,
      fallback: true,
    };
  }

  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey) {
    return clientEvaluateSpeech({ spokenText: said, targetSentence });
  }

  const cleanHistory = sanitizeHistory(history).slice(-8);
  const userBlock = [
    `Lesson: ${lessonContext || "AI Call"}`,
    `Level: ${level}`,
    targetSentence ? `Target sentence: ${targetSentence}` : "",
    `Student said (STT): ${said}`,
    "Evaluate and respond in JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await openaiChatCompletions({
    model: resolveModelForTier(MODEL_TIER.STANDARD),
    temperature: 0.4,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: getAiCallEvaluateSystemPrompt() },
      ...cleanHistory,
      { role: "user", content: userBlock },
    ],
  });

  if (!result.ok) {
    return clientEvaluateSpeech({ spokenText: said, targetSentence });
  }

  const parsed = parseEvaluateJson(result.data.content);
  if (!parsed?.teacher_reply) {
    return clientEvaluateSpeech({ spokenText: said, targetSentence });
  }

  if (!parsed.you_said) parsed.you_said = said;
  if (!parsed.correct_sentence) parsed.correct_sentence = targetSentence || said;
  if (!parsed.say_again) parsed.say_again = parsed.correct_sentence;

  return parsed;
}
