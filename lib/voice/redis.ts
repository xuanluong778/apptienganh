import Redis from "ioredis";
import { getSettingSync } from "@/lib/runtime-settings/cache";

let singleton: Redis | null = null;

export function voiceRedisUrl(): string | null {
  const fromEnv = process.env.REDIS_URL?.trim();
  if (fromEnv) return fromEnv;
  const fromSettings = getSettingSync("REDIS_URL")?.trim();
  return fromSettings || null;
}

export function getVoiceRedis(): Redis | null {
  const url = voiceRedisUrl();
  if (!url) return null;
  if (!singleton) {
    singleton = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    singleton.on("error", (err) => {
      console.error("[voice-redis] client_error", err?.message || err);
    });
  }
  return singleton;
}

export function voiceKeys() {
  return {
    sess: (sessionId: string) => `voice:sess:${sessionId}`,
    mem: (sessionId: string) => `voice:mem:${sessionId}`,
    chan: (sessionId: string) => `voice:chan:${sessionId}`,
    cancel: (sessionId: string, requestId: number) => `voice:cancel:${sessionId}:${requestId}`,
    // Phase 3 (not required yet): streams for replay
    stream: (sessionId: string) => `voice:stream:${sessionId}`,
  };
}

