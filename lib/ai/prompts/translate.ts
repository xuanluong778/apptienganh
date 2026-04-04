import type { PromptBundle } from "./types";

/**
 * English → Vietnamese; translation only unless the learner text asks for more.
 */
export function buildTranslatePrompt(input: string): PromptBundle {
  return {
    system:
      "You are a translator for English learners. Translate the text into natural Vietnamese only. No notes, alternatives, or explanations unless the learner text explicitly asks for them.",
    input,
  };
}
