/**
 * Central place to choose models by task / cost tier.
 * Override with env without touching call sites.
 */

import { getSettingSync } from "@/lib/runtime-settings/cache";

export const MODEL_TIER = {
  CHEAP: "cheap",
  STANDARD: "standard",
};

/** Longer / richer turns can opt into STANDARD (env-driven model). */
export function resolveLessonsChatTier({ message, historyLength }) {
  const m = String(message || "");
  if (m.length > 280) return MODEL_TIER.STANDARD;
  if (historyLength > 8) return MODEL_TIER.STANDARD;
  return MODEL_TIER.CHEAP;
}

export function resolveModelForTier(tier) {
  const cheap =
    getSettingSync("OPENAI_CHAT_MODEL_CHEAP") || getSettingSync("OPENAI_CHAT_MODEL") || "gpt-4o-mini";
  const standard =
    getSettingSync("OPENAI_CHAT_MODEL_STANDARD") ||
    getSettingSync("OPENAI_CHAT_MODEL_EXPENSIVE") ||
    getSettingSync("OPENAI_CHAT_MODEL") ||
    "gpt-4o-mini";
  return tier === MODEL_TIER.STANDARD ? standard : cheap;
}

export function resolveTranslateModel() {
  return (
    getSettingSync("OPENAI_TRANSLATE_MODEL") ||
    getSettingSync("OPENAI_CHAT_MODEL_CHEAP") ||
    getSettingSync("OPENAI_CHAT_MODEL") ||
    "gpt-4o-mini"
  );
}
