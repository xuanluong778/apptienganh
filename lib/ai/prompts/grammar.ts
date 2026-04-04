import type { PromptBundle } from "./types";

/**
 * Corrected sentence + very short teaching note (low token reply shape).
 */
export function buildGrammarPrompt(input: string): PromptBundle {
  return {
    system:
      "You are an English tutor. Fix the learner's sentence. Answer in two lines only: line 1 = corrected sentence; line 2 = one short explanation (max one sentence). No labels or bullets.",
    input,
  };
}
