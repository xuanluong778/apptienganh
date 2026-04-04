/**
 * Barrel for structured prompts (`/lib/ai/prompts/*`).
 * Import from `@/lib/ai/prompts` or `@/lib/ai/prompts/index`.
 */

export {
  getPrompt,
  getPromptForAiRoute,
  describePromptForResponse,
  type PromptKind,
  type AiPromptRouteType,
  type PromptBundle,
  type ChatPromptVariant,
  type GetPromptOptions,
} from "./prompts/index";

export {
  assignChatPromptVariant,
  markChatPromptFollowUp,
  logChatPromptExposure,
  logChatPromptVariantSelection,
} from "./experiments/chat-prompt-ab";
