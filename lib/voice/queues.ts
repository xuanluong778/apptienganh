import { Queue } from "bullmq";
import Redis from "ioredis";
import { voiceRedisUrl } from "./redis";

export const VOICE_LLM_QUEUE = "voice-llm";
export const VOICE_TTS_QUEUE = "voice-tts";

let llmQueue: Queue | null = null;
let ttsQueue: Queue | null = null;

function connection() {
  const url = voiceRedisUrl();
  if (!url) return null;
  return new Redis(url, { maxRetriesPerRequest: null });
}

export function getVoiceLlmQueue(): Queue | null {
  if (llmQueue) return llmQueue;
  const conn = connection();
  if (!conn) return null;
  llmQueue = new Queue(VOICE_LLM_QUEUE, { connection: conn });
  return llmQueue;
}

export function getVoiceTtsQueue(): Queue | null {
  if (ttsQueue) return ttsQueue;
  const conn = connection();
  if (!conn) return null;
  ttsQueue = new Queue(VOICE_TTS_QUEUE, { connection: conn });
  return ttsQueue;
}

