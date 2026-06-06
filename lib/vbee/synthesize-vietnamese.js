import { getSettingSync } from "@/lib/runtime-settings/cache";
import {
  hasVietnameseForTts,
  prepareVietnameseTtsText,
} from "@/lib/vbee/prepare-vietnamese-tts-text";
import {
  buildVbeeTtsCacheKey,
  readVbeeTtsFromCache,
  writeVbeeTtsToCache,
} from "@/lib/vbee/tts-file-cache";

const DEFAULT_VBEE_URL = "https://api.vbee.vn/v1/tts";
const DEFAULT_VOICE = "hn_female_ngochuyen_full_48k-fhg";

function resolveVbeeApiUrl() {
  const direct = getSettingSync("VBEE_API_URL");
  if (direct && direct.includes("api.vbee.vn")) return direct;

  // VBEE_API_BASE=https://vbee.vn/api/v1 is batch/async — Realtime sync uses api.vbee.vn
  const base = getSettingSync("VBEE_API_BASE");
  if (base && String(base).includes("api.vbee.vn")) {
    const trimmed = String(base).replace(/\/$/, "");
    return trimmed.endsWith("/tts") ? trimmed : `${trimmed}/tts`;
  }

  return DEFAULT_VBEE_URL;
}

function getVbeeConfig() {
  return {
    token: getSettingSync("VBEE_API_TOKEN") || getSettingSync("VBEE_TOKEN") || "",
    appId: getSettingSync("VBEE_APP_ID") || "",
    userId: getSettingSync("VBEE_USER_ID") || "",
    voiceCode: getSettingSync("VBEE_VOICE_CODE") || DEFAULT_VOICE,
    apiUrl: resolveVbeeApiUrl(),
  };
}

export function isVbeeConfigured() {
  const { token, appId } = getVbeeConfig();
  return Boolean(token && appId);
}

export { hasVietnameseForTts, prepareVietnameseTtsText };

/**
 * VBEE Realtime (sync) TTS — returns MP3 buffer.
 * @see https://api-docs.vbee.vn/vbee-api/text-to-speech/realtime-api
 */
export async function synthesizeVbeeVietnamese(text) {
  const normalized = prepareVietnameseTtsText(text);
  if (!normalized) {
    return { ok: false, code: "EMPTY_TEXT", message: "Text is required." };
  }
  if (!hasVietnameseForTts(normalized)) {
    return {
      ok: false,
      code: "NOT_VIETNAMESE",
      message:
        "Chưa có giải thích tiếng Việt để đọc. Hãy chọn chế độ EN+VI hoặc Beginner.",
    };
  }

  const { token, appId, userId, voiceCode, apiUrl } = getVbeeConfig();
  if (!token || !appId) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "VBEE is not configured. Add VBEE_API_TOKEN and VBEE_APP_ID.",
    };
  }

  const cacheKey = buildVbeeTtsCacheKey(normalized, voiceCode);
  const cached = await readVbeeTtsFromCache(cacheKey);
  if (cached) {
    return {
      ok: true,
      buffer: cached.buffer,
      contentType: cached.contentType,
      characters: normalized.length,
      fromCache: true,
    };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "App-Id": appId,
    "x-app-id": appId,
  };
  if (userId) headers["x-user-id"] = userId;

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: normalized,
        mode: "sync",
        voiceCode,
        outputFormat: "mp3",
        bitrate: 128,
        speed: 1.0,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: error?.message || "VBEE request failed.",
    };
  }

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let message = `VBEE error (${response.status})`;
    try {
      const errJson = await response.json();
      message = errJson?.error?.message || errJson?.message || message;
    } catch (_err) {
      // ignore
    }
    return { ok: false, code: "VBEE_ERROR", message };
  }

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      const link = data?.audio_link || data?.data?.audio_link || data?.result?.audio_link;
      if (link) {
        const audioRes = await fetch(link, { signal: AbortSignal.timeout(15000) });
        if (!audioRes.ok) {
          return { ok: false, code: "VBEE_ERROR", message: "Failed to download VBEE audio." };
        }
        const buffer = Buffer.from(await audioRes.arrayBuffer());
        await writeVbeeTtsToCache(cacheKey, buffer);
        return {
          ok: true,
          buffer,
          contentType: audioRes.headers.get("content-type") || "audio/mpeg",
          characters: normalized.length,
          fromCache: false,
        };
      }
      return { ok: false, code: "VBEE_ERROR", message: "Unexpected VBEE JSON response." };
    } catch (_err) {
      return { ok: false, code: "VBEE_ERROR", message: "Invalid VBEE response." };
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    return { ok: false, code: "VBEE_ERROR", message: "VBEE returned empty audio." };
  }

  await writeVbeeTtsToCache(cacheKey, buffer);

  return {
    ok: true,
    buffer,
    contentType: contentType.includes("audio") ? contentType.split(";")[0] : "audio/mpeg",
    characters: normalized.length,
    fromCache: false,
  };
}
