import { createHash, randomUUID } from "node:crypto";
import { getSettingSync } from "@/lib/runtime-settings/cache";
import { resolveAiRoute, type AiRouteInput, type AiRouteType } from "./router";
import { describePromptForResponse } from "./prompts/index";
import { logChatPromptExposure, markChatPromptFollowUp } from "./experiments/chat-prompt-ab";
import { recordChatSessionUserMessage, updateChatSessionLastVariant } from "./experiments/chat-performance-metrics";
import { getCachedAIResponse, setCachedAIResponse } from "./cache/response-cache";
import { normalizeLearnerInput } from "./normalize-input";
import type { AIResponse } from "./types";

export type { AIResponse, AiRouteInput, AiRouteType };
export { resolveAiRoute } from "./router";
export { normalizeLearnerInput, normalizeLearnerInput as normalizeMessageContent } from "./normalize-input";

/** Prior turns only (no system). */
export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

const MAX_PRIOR_TURNS = 5;

/** TTL for cache entries (Redis `EX` + memory); override with `AI_CLIENT_CACHE_TTL_MS`. */
function cacheTtlMs(): number {
  const raw = getSettingSync("AI_CLIENT_CACHE_TTL_MS");
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  return 10 * 60 * 1000;
}

const inFlight = new Map<string, Promise<AIResponse | null>>();

function cacheDebug(message: string, meta?: Record<string, unknown>): void {
  if (getSettingSync("AI_CLIENT_CACHE_DEBUG") !== "1") return;
  console.debug(`[ai-client-cache] ${message}`, meta && Object.keys(meta).length ? meta : "");
}

export function hashRequestPayload(payload: {
  m: string;
  t: number;
  x: number;
  msg: ChatMessage[];
}): string {
  const canonical = JSON.stringify(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function makeRequestCacheKey(params: {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: ChatMessage[];
}): string {
  const normalizedMessages: ChatMessage[] = params.messages.map((row) => ({
    role: row.role,
    content: normalizeLearnerInput(row.content),
  }));

  const payload = {
    m: normalizeLearnerInput(params.model),
    t: params.temperature,
    x: params.max_tokens,
    msg: normalizedMessages,
  };

  return hashRequestPayload(payload);
}

function cloneResponse(r: AIResponse): AIResponse {
  return { ...r };
}

function normalizeTurn(m: ChatTurn): ChatTurn | null {
  const role = m.role;
  if (role !== "user" && role !== "assistant") return null;
  const content = normalizeLearnerInput(String(m.content ?? ""));
  if (!content) return null;
  return { role, content };
}

/**
 * Builds OpenAI chat messages: system first, optional capped history, then current user input.
 */
export function buildMessages(params: {
  system: string;
  input: string;
  messages?: ChatTurn[] | null;
}): ChatMessage[] {
  const input = normalizeLearnerInput(String(params.input ?? ""));
  const system = normalizeLearnerInput(String(params.system ?? ""));
  const prior = params.messages;

  if (!prior?.length) {
    return [
      { role: "system", content: system },
      { role: "user", content: input },
    ];
  }

  const recentMessages = prior
    .slice(-MAX_PRIOR_TURNS)
    .map(normalizeTurn)
    .filter((m): m is ChatTurn => m != null);

  return [
    { role: "system", content: system },
    ...recentMessages,
    { role: "user", content: input },
  ];
}

/**
 * Run a routed AI completion: router picks model/temperature; prompt system builds system + user text.
 */
export async function completeAi(
  routeInput: AiRouteInput,
  messages?: ChatTurn[] | null
): Promise<AIResponse | null> {
  const userContent = normalizeLearnerInput(String(routeInput.input ?? ""));
  if (!userContent) return null;

  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey) return null;

  if (routeInput.type === "chat") {
    if (routeInput.sessionId) {
      recordChatSessionUserMessage({
        sessionId: routeInput.sessionId,
        userId: routeInput.userId ?? null,
      });
    }
    if (routeInput.userId) {
      markChatPromptFollowUp(routeInput.userId).catch(() => {});
    }
  }

  const route = resolveAiRoute({
    type: routeInput.type,
    input: userContent,
    chatVariant: routeInput.chatVariant,
    userId: routeInput.userId,
    learnerLevel: routeInput.learnerLevel,
    sessionMessageCount: routeInput.sessionMessageCount,
  });
  if (!route.systemPrompt) return null;

  const model = route.model;
  const system = route.systemPrompt;
  const max_tokens = route.maxTokens;
  const temperature = route.temperature;
  const userMessage = route.userContent;

  const requestMessages = buildMessages({
    system,
    input: userMessage,
    messages,
  });

  const cacheKey = makeRequestCacheKey({
    model,
    temperature,
    max_tokens,
    messages: requestMessages,
  });

  const cached = await getCachedAIResponse(cacheKey);
  if (cached) return cloneResponse(cached);

  const existingFlight = inFlight.get(cacheKey);
  if (existingFlight) {
    cacheDebug("in_flight_join", { keyShort: cacheKey.slice(0, 12) });
    const shared = await existingFlight;
    return shared ? cloneResponse(shared) : null;
  }

  cacheDebug("miss", { keyShort: cacheKey.slice(0, 12), model, type: routeInput.type });

  const flight = (async (): Promise<AIResponse | null> => {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens,
          messages: requestMessages,
        }),
      });

      if (!res.ok) return null;

      const json = (await res.json()) as OpenAIChatResponse;
      const result = String(json?.choices?.[0]?.message?.content ?? "").trim();
      if (!result) return null;

      const out: AIResponse = {
        model,
        prompt: describePromptForResponse(routeInput.type, userMessage, {
          chatVariant: route.chatPromptVariant,
          learnerLevel: routeInput.learnerLevel,
          sessionMessageCount: routeInput.sessionMessageCount,
        }),
        result,
      };

      if (routeInput.type === "chat" && routeInput.userId && route.chatPromptVariant) {
        const traceId = randomUUID();
        out.chatPromptVariant = route.chatPromptVariant;
        out.experimentTraceId = traceId;
        updateChatSessionLastVariant({
          sessionId: routeInput.sessionId,
          variant: route.chatPromptVariant,
        });
        logChatPromptExposure({
          userId: routeInput.userId,
          variant: route.chatPromptVariant,
          responseLength: result.length,
          traceId,
          sessionId: routeInput.sessionId,
        }).catch(() => {});
      }

      await setCachedAIResponse(cacheKey, out, cacheTtlMs());
      return out;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, flight);
  const resolved = await flight;
  return resolved ? cloneResponse(resolved) : null;
}
