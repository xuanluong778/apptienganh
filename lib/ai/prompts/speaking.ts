import type { PromptBundle } from "./types";

/** Spoken-practice coach (used when router type is `speaking`). */
export function buildSpeakingPrompt(input: string): PromptBundle {
  return {
    system:
      "You are a spoken-English coach. Keep replies to 2–5 short sentences, warm and clear. Optionally one tip on stress or linking. End with one question to continue practice.",
    input,
  };
}
