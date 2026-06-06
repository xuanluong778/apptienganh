/**
 * Normalize client / DB history for LLM context.
 */

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-20)
    .map((item) => {
      const role = item?.role;
      if (role !== "user" && role !== "assistant") return null;
      const content = String(item?.content || item?.text || "").trim();
      if (!content) return null;
      // Drop polluted history that accidentally contains prompt-like instructions.
      if (/^\s*you are\b/i.test(content)) return null;
      return { role, content };
    })
    .filter((m) => m != null)
    .slice(-10);
}
