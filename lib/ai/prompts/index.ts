import { normalizeLearnerInput } from "../normalize-input";
import { logChatPromptVariantSelection } from "../experiments/chat-prompt-ab";
import {
  buildChatPrompt,
  resolveChatPromptVariantForUser,
  summarizeChatPersonalizationForLog,
  type ChatPromptVariant,
} from "./chat";
import { buildGrammarPrompt } from "./grammar";
import type { LearnerLevel, PromptBundle } from "./types";
import type { GetPromptOptions } from "./options";
import { buildSpeakingPrompt } from "./speaking";
import { buildTranslatePrompt } from "./translate";

export type { PromptBundle } from "./types";
export type { ChatPromptVariant } from "./chat";
export type { ChatPromptVariantId, LearnerLevel } from "./types";
export type { GetPromptOptions } from "./options";
export { resolveChatPromptVariantForUser, chatPromptV1, chatPromptV2 } from "./chat";

/** Types supported by `getPrompt` (router also supports `speaking` via `getPromptForAiRoute`). */
export type PromptKind = "chat" | "translate" | "grammar";

export type AiPromptRouteType = PromptKind | "speaking";

function selectChatVariant(options: GetPromptOptions): ChatPromptVariant {
  return options.chatVariant ?? resolveChatPromptVariantForUser(options.userId ?? undefined);
}

/**
 * Build `{ system, input }` for chat | translate | grammar.
 * For **chat**: selects **V1/V2** from `userId` (deterministic) unless `chatVariant` is set; logs selection.
 */
export function getPrompt(type: PromptKind, rawInput: string, options: GetPromptOptions = {}): PromptBundle {
  const input = normalizeLearnerInput(rawInput);
  if (!input) {
    return { system: "", input: "" };
  }
  switch (type) {
    case "chat": {
      const variant = selectChatVariant(options);
      logChatPromptVariantSelection({
        userId: options.userId ?? null,
        variant,
        source: "getPrompt",
      });
      return buildChatPrompt(input, variant, {
        learnerLevel: options.learnerLevel,
        sessionMessageCount: options.sessionMessageCount,
      });
    }
    case "translate":
      return buildTranslatePrompt(input);
    case "grammar":
      return buildGrammarPrompt(input);
  }
}

/** All AI route types (matches `AiRouteType` in router). */
export function getPromptForAiRoute(
  type: AiPromptRouteType,
  rawInput: string,
  options: GetPromptOptions = {}
): PromptBundle {
  const input = normalizeLearnerInput(rawInput);
  if (!input) {
    return { system: "", input: "" };
  }
  switch (type) {
    case "chat": {
      const variant = selectChatVariant(options);
      logChatPromptVariantSelection({
        userId: options.userId ?? null,
        variant,
        source: "getPromptForAiRoute",
      });
      return buildChatPrompt(input, variant, {
        learnerLevel: options.learnerLevel,
        sessionMessageCount: options.sessionMessageCount,
      });
    }
    case "translate":
      return buildTranslatePrompt(input);
    case "grammar":
      return buildGrammarPrompt(input);
    case "speaking":
      return buildSpeakingPrompt(input);
  }
}

/** Compact logging field for `AIResponse.prompt` — no full system text. */
export function describePromptForResponse(
  type: string,
  userText: string,
  meta?: {
    chatVariant?: ChatPromptVariant;
    learnerLevel?: LearnerLevel | null;
    sessionMessageCount?: number | null;
  }
): string {
  const clip = userText.trim().slice(0, 600);
  let tag = meta?.chatVariant ? `${type}|${meta.chatVariant}` : type;
  const p = summarizeChatPersonalizationForLog({
    learnerLevel: meta?.learnerLevel,
    sessionMessageCount: meta?.sessionMessageCount,
  });
  if (p) tag = `${tag}|${p}`;
  return `[${tag}] ${clip}${userText.length > 600 ? "…" : ""}`;
}
