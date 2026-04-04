/**
 * Free-tier fallback translator (non-OpenAI). Used when AI is disabled or fails.
 */

export async function translateWithMyMemoryPublicApi(text) {
  const chunk = String(text || "").slice(0, 500);
  if (!chunk.trim()) return "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|vi`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return "";
  const json = await res.json().catch(() => ({}));
  return String(json?.responseData?.translatedText || "").trim();
}
