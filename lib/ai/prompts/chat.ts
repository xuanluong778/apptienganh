import { createHash } from "node:crypto";
import { getSettingSync } from "@/lib/runtime-settings/cache";
import type { PromptBundle, ChatPromptVariantId, LearnerLevel } from "./types";

export type ChatPromptVariant = ChatPromptVariantId;

export type ChatPersonalizationInput = {
  learnerLevel?: LearnerLevel | null;
  sessionMessageCount?: number | null;
};

/** Variant V1 — natural short replies, fix by example, one follow-up question. */
export const chatPromptV1 =
  "You are an English tutor. Reply in 2–4 short sentences (A2–B1). Chat naturally; fix their English by example, not by scolding or listing mistakes. One follow-up question when it fits.";

/** Variant V2 — tighter length, nudge learner to notice phrasing without grammar labels. */
export const chatPromptV2 =
  "You are an English tutor. Use 2–3 short sentences only. Be warm; improve their English mostly by example. Ask one question that helps them notice how to say it better—avoid listing errors or grammar labels.";

const BY_VARIANT: Record<ChatPromptVariantId, string> = {
  V1: chatPromptV1,
  V2: chatPromptV2,
};

/**
 * Deterministic variant per user (stable across sessions).
 * Env: `CHAT_PROMPT_AB=off` → always V1; `CHAT_PROMPT_FORCE=V1|V2` (or legacy A|B).
 * Without `userId`, defaults to **V1** (stable, no random).
 */
export function resolveChatPromptVariantForUser(userId: number | null | undefined): ChatPromptVariantId {
  const force = (getSettingSync("CHAT_PROMPT_FORCE") || "").trim().toUpperCase();
  if (force === "V1" || force === "A") return "V1";
  if (force === "V2" || force === "B") return "V2";

  const mode = (getSettingSync("CHAT_PROMPT_AB") || "on").trim().toLowerCase();
  if (mode === "off" || mode === "false" || mode === "0") return "V1";

  if (userId == null || !Number.isFinite(Number(userId))) {
    return "V1";
  }

  const h = createHash("sha256").update(`chat-prompt-deterministic|${Number(userId)}`).digest();
  return h[0]! % 2 === 0 ? "V1" : "V2";
}

export function getChatSystemForVariant(variant: ChatPromptVariantId): string {
  return BY_VARIANT[variant] ?? BY_VARIANT.V1;
}

/** Mid band omitted to limit tokens; thresholds are inclusive on the low/high sides. */
function engagementTierFromCount(
  count: number | null | undefined
): "low" | "mid" | "high" | null {
  if (count == null || !Number.isFinite(Number(count))) return null;
  const c = Math.max(0, Math.floor(Number(count)));
  if (c <= 2) return "low";
  if (c >= 8) return "high";
  return "mid";
}

/**
 * Short trailing instructions appended to the base tutor line (~20–40 tokens when both axes set).
 * Omit when no personalization inputs.
 */
export function buildChatPersonalizationAdjunct(p: ChatPersonalizationInput | null | undefined): string {
  if (!p) return "";
  const parts: string[] = [];
  switch (p.learnerLevel) {
    case "beginner":
      parts.push("Beginner: simplest English, very short lines, encourage.");
      break;
    case "intermediate":
      parts.push("Intermediate: natural everyday English; fix by example.");
      break;
    case "advanced":
      parts.push("Advanced: allow nuance; one brief deeper note when it helps.");
      break;
    default:
      break;
  }
  const eng = engagementTierFromCount(p.sessionMessageCount);
  if (eng === "low") parts.push("Few messages this session: warmer, simpler, praise effort.");
  if (eng === "high") parts.push("Active session: add one clear extra teaching point when helpful.");
  return parts.join(" ");
}

/** Compact tag for logs, e.g. `beg+eLo`. */
export function summarizeChatPersonalizationForLog(p: ChatPersonalizationInput | null | undefined): string {
  if (!p) return "";
  const bits: string[] = [];
  if (p.learnerLevel === "beginner") bits.push("beg");
  else if (p.learnerLevel === "intermediate") bits.push("int");
  else if (p.learnerLevel === "advanced") bits.push("adv");
  const eng = engagementTierFromCount(p.sessionMessageCount);
  if (eng === "low") bits.push("eLo");
  if (eng === "high") bits.push("eHi");
  return bits.join("+");
}

export function buildChatPrompt(
  input: string,
  variant: ChatPromptVariantId = "V1",
  personalization?: ChatPersonalizationInput | null
): PromptBundle {
  const base = getChatSystemForVariant(variant);
  const adj = buildChatPersonalizationAdjunct(personalization);
  return {
    system: adj ? `${base} ${adj}` : base,
    input,
    chatVariant: variant,
  };
}
