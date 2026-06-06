import { buildVocabularyImageMetadata } from "@/lib/vocabulary/image-prompt";

/** @deprecated Prefer buildVocabularyImageMetadata for semantic images. */
export function buildAiImageUrl(word, topic = "") {
  const meta = buildVocabularyImageMetadata({
    word,
    topic,
    vietnamese_meaning: "",
    part_of_speech: "noun",
  });
  return meta.image_url;
}
