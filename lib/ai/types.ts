import type { ChatPromptVariant } from "./prompts/chat";

export type AIResponse = {
  model: string;
  prompt: string;
  result: string;
  /** Present when `completeAi` ran with `type: "chat"` + `userId` + successful response. */
  chatPromptVariant?: ChatPromptVariant;
  /** Correlate follow-up requests / analytics. */
  experimentTraceId?: string;
};
