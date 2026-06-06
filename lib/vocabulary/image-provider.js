import { buildVocabularyImageMetadata } from "@/lib/vocabulary/image-prompt";

/**
 * Resolve the best image URL for a vocabulary row.
 * Approved images are kept; otherwise regenerate from semantic metadata.
 * @param {object} row
 * @returns {{ image_url: string, needs_regeneration: boolean }}
 */
export function resolveVocabularyImageUrl(row) {
  const status = String(row?.image_status || "").toLowerCase();
  const existing = String(row?.image_url || "").trim();

  if (existing && (status === "approved" || status === "pending" || !status)) {
    return { image_url: existing, needs_regeneration: false };
  }

  if (existing && status === "rejected") {
    const meta = buildVocabularyImageMetadata(row);
    return { image_url: meta.image_url, needs_regeneration: true };
  }

  if (existing) {
    return { image_url: existing, needs_regeneration: false };
  }

  const meta = buildVocabularyImageMetadata(row);
  return { image_url: meta.image_url, needs_regeneration: true };
}
