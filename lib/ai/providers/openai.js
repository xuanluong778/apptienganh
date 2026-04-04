/**
 * Low-level OpenAI Chat Completions bridge (no prompts here).
 */

import { getSettingSync } from "@/lib/runtime-settings/cache";

export async function openaiChatCompletions({
  model,
  messages,
  temperature = 0.7,
  max_tokens = 1024,
  response_format = null,
}) {
  const apiKey = getSettingSync("OPENAI_API_KEY") || "";
  if (!apiKey) {
    return { ok: false, error: "missing_api_key", data: null };
  }

  const body = {
    model,
    temperature,
    max_tokens,
    messages,
  };
  if (response_format) body.response_format = response_format;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: `openai_http_${res.status}`,
      data: json,
    };
  }

  const content = json?.choices?.[0]?.message?.content ?? "";
  return { ok: true, error: null, data: { content: String(content), raw: json } };
}
