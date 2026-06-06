import { createHash } from "crypto";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DEFAULT_CACHE_DIR = path.join(process.cwd(), ".cache", "vbee-tts");

function resolveCacheDir() {
  const custom = String(process.env.VBEE_CACHE_DIR || "").trim();
  return custom || DEFAULT_CACHE_DIR;
}

export function buildVbeeTtsCacheKey(normalizedText, voiceCode) {
  return createHash("sha256")
    .update(String(voiceCode || ""))
    .update("\n")
    .update(String(normalizedText || ""))
    .digest("hex");
}

function cacheFilePath(cacheKey) {
  return path.join(resolveCacheDir(), `${cacheKey}.mp3`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read cached MP3 if it exists (same prepared text + voice).
 */
export async function readVbeeTtsFromCache(cacheKey) {
  const filePath = cacheFilePath(cacheKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  try {
    const buffer = await readFile(filePath);
    if (!buffer.length) return null;
    return { buffer, contentType: "audio/mpeg", fromCache: true };
  } catch {
    return null;
  }
}

/**
 * Persist MP3 after a successful VBEE call.
 */
export async function writeVbeeTtsToCache(cacheKey, buffer) {
  if (!buffer?.length) return;
  const dir = resolveCacheDir();
  await mkdir(dir, { recursive: true });
  const filePath = cacheFilePath(cacheKey);
  await writeFile(filePath, buffer);
}
