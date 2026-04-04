/**
 * Normalize client / DB history for LLM context.
 */

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content || item?.text || "").trim(),
    }))
    .filter((m) => m.content);
}
