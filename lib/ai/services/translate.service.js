import { getTranslateEnToViSystemPrompt } from "../prompts/translate-en-vi";
import { openaiChatCompletions } from "../providers/openai";
import { translateWithMyMemoryPublicApi } from "../providers/mymemory-translate";
import { resolveTranslateModel } from "../model-router";

/**
 * @param {string} text
 * @returns {Promise<string|null>} translation or null if OpenAI path failed
 */
export async function translateEnglishToVietnameseViaOpenAI(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const result = await openaiChatCompletions({
    model: resolveTranslateModel(),
    temperature: 0.15,
    max_tokens: 1200,
    messages: [
      { role: "system", content: getTranslateEnToViSystemPrompt() },
      { role: "user", content: trimmed },
    ],
  });

  if (!result.ok) return null;
  const out = String(result.data.content || "").trim();
  return out || null;
}

/**
 * OpenAI first, then public fallback slice (matches previous API behavior).
 */
export async function translateEnglishToVietnameseWithFallback(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  let translated = await translateEnglishToVietnameseViaOpenAI(t);
  if (!translated) {
    translated = await translateWithMyMemoryPublicApi(t.slice(0, 480));
  }
  return translated || "";
}
