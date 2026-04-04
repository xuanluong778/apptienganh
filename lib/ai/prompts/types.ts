/** Chat A/B labels (deterministic per user in `getPrompt` when `userId` is set). */
export type ChatPromptVariantId = "V1" | "V2";

/** Optional learner calibration for chat system text (from profile or UI). */
export type LearnerLevel = "beginner" | "intermediate" | "advanced";

export type PromptBundle = {
  system: string;
  input: string;
  /** Present for `type === "chat"` after variant selection. */
  chatVariant?: ChatPromptVariantId;
};
