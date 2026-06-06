/** URLs that often fail in browser (403/500) — skip and use stable fallback. */
export function isUnreliableImageUrl(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return true;
  return u.includes("loremflickr.com") || u.includes("flodjsflickr.com");
}

/** Deterministic picsum seed — stable per word/id, works in <img> without API key. */
export function buildStableVocabImageUrl(row) {
  const word = String(row?.word || "vocab")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");
  const id = row?.id != null ? String(row.id) : "";
  const seed = encodeURIComponent(`beego-vocab-${word}-${id}`.slice(0, 72));
  return `https://picsum.photos/seed/${seed}/640/480`;
}
