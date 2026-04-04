/** Shared learner text normalization for prompts, cache keys, and API payloads. */
export function normalizeLearnerInput(content: string): string {
  return String(content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .trim();
}
