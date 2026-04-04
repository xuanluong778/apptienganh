import Redis from "ioredis";
import { getSettingSync } from "@/lib/runtime-settings/cache";
import type { AIResponse } from "../types";

const FALLBACK_MAX_ENTRIES = 300;

function keyPrefix(): string {
  return getSettingSync("REDIS_AI_KEY_PREFIX")?.trim() || "ai:client:v1:";
}

type MemoryEntry = {
  value: AIResponse;
  expiresAt: number;
};

const memoryFallback = new Map<string, MemoryEntry>();

let redisSingleton: Redis | null = null;

function cacheDebug(message: string, meta?: Record<string, unknown>): void {
  if (getSettingSync("AI_CLIENT_CACHE_DEBUG") !== "1") return;
  console.debug(`[ai-response-cache] ${message}`, meta && Object.keys(meta).length ? meta : "");
}

function redisUrl(): string | null {
  const u = getSettingSync("REDIS_URL")?.trim();
  return u || null;
}

function getRedis(): Redis | null {
  const url = redisUrl();
  if (!url) return null;
  if (!redisSingleton) {
    redisSingleton = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    redisSingleton.on("error", (err) => {
      cacheDebug("redis_client_error", { message: err?.message || String(err) });
    });
  }
  return redisSingleton;
}

function redisFullKey(hashKey: string): string {
  return `${keyPrefix()}${hashKey}`;
}

function getMemory(hashKey: string): AIResponse | null {
  const entry = memoryFallback.get(hashKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryFallback.delete(hashKey);
    cacheDebug("memory_expired", { keyShort: hashKey.slice(0, 12) });
    return null;
  }
  return { ...entry.value };
}

function setMemory(hashKey: string, value: AIResponse, ttlMs: number): void {
  if (memoryFallback.size >= FALLBACK_MAX_ENTRIES) {
    const first = memoryFallback.keys().next().value;
    if (first !== undefined) memoryFallback.delete(first);
  }
  memoryFallback.set(hashKey, {
    value: { ...value },
    expiresAt: Date.now() + ttlMs,
  });
}

function parseResponse(raw: string): AIResponse | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const model = String(o.model ?? "");
    const prompt = String(o.prompt ?? "");
    const result = String(o.result ?? "").trim();
    if (!result) return null;
    return { model, prompt, result };
  } catch {
    return null;
  }
}

/**
 * Shared cache read: Redis first (cross-process), then in-memory fallback.
 */
export async function getCachedAIResponse(hashKey: string): Promise<AIResponse | null> {
  const r = getRedis();
  if (r) {
    try {
      const raw = await r.get(redisFullKey(hashKey));
      if (raw) {
        const parsed = parseResponse(raw);
        if (parsed) {
          cacheDebug("redis_hit", { keyShort: hashKey.slice(0, 12) });
          return parsed;
        }
      }
      cacheDebug("redis_miss", { keyShort: hashKey.slice(0, 12) });
    } catch (err) {
      cacheDebug("redis_get_error_fallback_memory", {
        keyShort: hashKey.slice(0, 12),
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const local = getMemory(hashKey);
  if (local) {
    cacheDebug("memory_hit", { keyShort: hashKey.slice(0, 12) });
  }
  return local;
}

/**
 * Shared cache write: Redis SET with TTL; always warm memory for fast local reads + offline fallback.
 */
export async function setCachedAIResponse(
  hashKey: string,
  value: AIResponse,
  ttlMs: number
): Promise<void> {
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  const payload = JSON.stringify(value);

  setMemory(hashKey, value, ttlMs);

  const r = getRedis();
  if (!r) {
    cacheDebug("memory_store_only", { keyShort: hashKey.slice(0, 12), ttlMs });
    return;
  }

  try {
    await r.set(redisFullKey(hashKey), payload, "EX", ttlSec);
    cacheDebug("redis_store", { keyShort: hashKey.slice(0, 12), ttlSec });
  } catch (err) {
    cacheDebug("redis_set_error_memory_only", {
      keyShort: hashKey.slice(0, 12),
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
