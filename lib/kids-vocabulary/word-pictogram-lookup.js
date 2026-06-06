/**
 * ARASAAC — pictogram hoạt hình miễn phí cho giáo dục (https://arasaac.org).
 */

import storyWordPictogram from "./story-word-pictogram.generated.js";

export const ARASAAC_PICTOGRAM_BASE = "https://static.arasaac.org/pictograms";

export function arasaacPictogramImageUrl(pictogramId, size = 500) {
  const id = Number(pictogramId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return `${ARASAAC_PICTOGRAM_BASE}/${id}/${id}_${size}.png`;
}

function normalizeWordKey(word) {
  return String(word || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function stems(word) {
  const w = word.toLowerCase();
  const out = new Set([w]);
  if (w.endsWith("ies")) out.add(`${w.slice(0, -3)}y`);
  if (w.endsWith("ing") && w.length > 4) out.add(w.slice(0, -3));
  if (w.endsWith("ed") && w.length > 3) out.add(w.slice(0, -2));
  if (w.endsWith("es") && w.length > 3) out.add(w.slice(0, -2));
  if (w.endsWith("s") && w.length > 2) out.add(w.slice(0, -1));
  return [...out];
}

/**
 * @param {string} word
 * @returns {number | null}
 */
export function resolveWordPictogramId(word) {
  const key = normalizeWordKey(word);
  if (!key) return null;
  if (storyWordPictogram[key]) return storyWordPictogram[key];
  for (const s of stems(key)) {
    if (storyWordPictogram[s]) return storyWordPictogram[s];
  }
  return null;
}

/**
 * @param {string} word
 * @returns {string | null}
 */
export function kidWordPictogramImageUrl(word) {
  const id = resolveWordPictogramId(word);
  return id ? arasaacPictogramImageUrl(id) : null;
}

/**
 * Chọn pictogram khớp từ nhất từ kết quả API ARASAAC.
 * @param {Array<{ _id: number, keywords?: Array<{ keyword?: string }>, aac?: boolean }>} items
 * @param {string} word
 */
export function pickArasaacPictogramId(items, word) {
  if (!Array.isArray(items) || !items.length) return null;
  const w = normalizeWordKey(word);

  for (const item of items) {
    for (const k of item.keywords || []) {
      if (String(k.keyword || "").toLowerCase() === w) return item._id;
    }
  }

  if (!w.includes(" ")) {
    for (const item of items) {
      const kws = (item.keywords || []).map((k) => String(k.keyword || "").toLowerCase());
      if (kws.some((kw) => kw === w)) return item._id;
    }
  }

  const aac = items.find((i) => i.aac);
  if (aac) return aac._id;
  return items[0]._id;
}
