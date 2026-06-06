import { getSettingSync } from "@/lib/runtime-settings/cache";

const VOICES = {
  vi: "vi-VN-HoaiMyNeural",
  en: "en-US-JennyNeural",
};

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(segments) {
  const parts = segments
    .map((seg) => {
      const lang = seg.lang === "vi" ? "vi-VN" : "en-US";
      const voice = VOICES[seg.lang === "vi" ? "vi" : "en"];
      const text = escapeXml(seg.text);
      return `<voice xml:lang="${lang}" name="${voice}">${text}</voice>`;
    })
    .join('<break time="400ms"/>');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">${parts}</speak>`;
}

async function synthesizeAzureMp3(segments) {
  const key = String(getSettingSync("AZURE_SPEECH_KEY") || "").trim();
  const region = String(getSettingSync("AZURE_SPEECH_REGION") || "").trim();
  if (!key || !region || !segments.length) return null;

  const ssml = buildSsml(segments);
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
    },
    body: ssml,
  });

  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) return null;
  return {
    buffer,
    contentType: "audio/mpeg",
    provider: "azure",
  };
}

async function synthesizeOpenAiMp3(segments) {
  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey || !segments.length) return null;

  const text = segments.map((s) => s.text).join(" ");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, 4096),
      voice: "nova",
      response_format: "mp3",
    }),
  });

  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) return null;
  return {
    buffer,
    contentType: "audio/mpeg",
    provider: "openai",
  };
}

/**
 * @param {{ lang: string, text: string }[]} segments
 */
export async function synthesizeTeacherSpeech(segments) {
  const cleaned = (segments || [])
    .map((s) => ({ lang: s.lang === "vi" ? "vi" : "en", text: String(s.text || "").trim() }))
    .filter((s) => s.text);

  if (!cleaned.length) {
    return { ok: false, fallback: { segments: [] } };
  }

  const azure = await synthesizeAzureMp3(cleaned);
  if (azure) {
    return {
      ok: true,
      audioBase64: azure.buffer.toString("base64"),
      contentType: azure.contentType,
      provider: azure.provider,
      subtitle: cleaned.map((s) => s.text).join(" · "),
      segments: cleaned,
    };
  }

  const openai = await synthesizeOpenAiMp3(cleaned);
  if (openai && !cleaned.some((s) => s.lang === "vi")) {
    return {
      ok: true,
      audioBase64: openai.buffer.toString("base64"),
      contentType: openai.contentType,
      provider: openai.provider,
      subtitle: cleaned.map((s) => s.text).join(" · "),
      segments: cleaned,
    };
  }

  return {
    ok: false,
    fallback: { segments: cleaned },
    subtitle: cleaned.map((s) => s.text).join(" · "),
  };
}
