/**
 * Central AI routing: request type → model, sampling, and prompt bundle from `/lib/ai/prompts`.
 */

import { getSettingSync } from "@/lib/runtime-settings/cache";
import { getPromptForAiRoute } from "./prompts/index";
import type { ChatPromptVariant } from "./prompts/chat";
import type { LearnerLevel } from "./prompts/types";

export type AiRouteType = "chat" | "translate" | "grammar" | "speaking";

export type AiRouteInput = {
  type: AiRouteType;
  input: string;
  /** Force V1/V2 (overrides deterministic `userId` split). */
  chatVariant?: ChatPromptVariant;
  /** With `type: "chat"`, `getPromptForAiRoute` picks variant + logs usage. */
  userId?: number | null;
  /** Opaque chat session key from client → `chat_session_metrics` + A/B exposure join. */
  sessionId?: string | null;
  /** Chat personalization (optional). */
  learnerLevel?: LearnerLevel | null;
  /** User messages in this session so far (optional; see `GetPromptOptions`). */
  sessionMessageCount?: number | null;
};

export type AiRouteConfig = {
  model: string;
  systemPrompt: string;
  /** Normalized learner text (user message); aligns with prompt bundle `input`. */
  userContent: string;
  maxTokens: number;
  temperature: number;
  /** Set when `type === "chat"` (for logging and `AIResponse`). */
  chatPromptVariant?: ChatPromptVariant;
};

type ModelTier = "cheapest" | "cheap" | "medium" | "expensive";

/** Cost tiers → env-backed model ids (override without touching routing logic). */
function modelsByTier(): Record<ModelTier, string> {
  const fallback = getSettingSync("OPENAI_CHAT_MODEL") || "gpt-4o-mini";
  return {
    cheapest:
      getSettingSync("OPENAI_MODEL_CHEAPEST") ||
      getSettingSync("OPENAI_MODEL_CHEAP") ||
      getSettingSync("OPENAI_CHAT_MODEL_CHEAP") ||
      fallback,
    cheap:
      getSettingSync("OPENAI_MODEL_CHEAP") || getSettingSync("OPENAI_CHAT_MODEL_CHEAP") || fallback,
    medium: getSettingSync("OPENAI_MODEL_MEDIUM") || getSettingSync("OPENAI_CHAT_MODEL") || fallback,
    expensive:
      getSettingSync("OPENAI_MODEL_EXPENSIVE") ||
      getSettingSync("OPENAI_CHAT_MODEL_STANDARD") ||
      getSettingSync("OPENAI_CHAT_MODEL_EXPENSIVE") ||
      getSettingSync("OPENAI_MODEL_MEDIUM") ||
      fallback,
  };
}

const ROUTING_RULES: Record<
  AiRouteType,
  { tier: ModelTier; maxTokens: number; temperature: number }
> = {
  translate: { tier: "cheapest", maxTokens: 480, temperature: 0.15 },
  grammar: { tier: "cheap", maxTokens: 280, temperature: 0.2 },
  chat: { tier: "medium", maxTokens: 400, temperature: 0.4 },
  speaking: { tier: "expensive", maxTokens: 480, temperature: 0.65 },
};

function pickModel(tier: ModelTier): string {
  return modelsByTier()[tier];
}

/**
 * Resolve model + normalized user content + system prompt + sampling.
 * Chat variant is chosen inside `getPromptForAiRoute` (deterministic per `userId`).
 */
export function resolveAiRoute(request: AiRouteInput): AiRouteConfig {
  const rule = ROUTING_RULES[request.type];
  const bundle = getPromptForAiRoute(request.type, request.input, {
    chatVariant: request.chatVariant,
    userId: request.type === "chat" ? request.userId : undefined,
    learnerLevel: request.type === "chat" ? request.learnerLevel : undefined,
    sessionMessageCount: request.type === "chat" ? request.sessionMessageCount : undefined,
  });

  return {
    model: pickModel(rule.tier),
    systemPrompt: bundle.system,
    userContent: bundle.input,
    maxTokens: rule.maxTokens,
    temperature: rule.temperature,
    chatPromptVariant: bundle.chatVariant,
  };
}
