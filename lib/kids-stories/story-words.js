/** Tách câu truyện thành danh sách từ (giữ thứ tự, có dấu câu gắn từ). */
export function buildStoryWords(paragraphs, lang = "en") {
  const tokens = [];
  paragraphs.forEach((p, pi) => {
    const text = lang === "vi" ? String(p.vi || "") : String(p.en || "");
    text.split(/\s+/).filter(Boolean).forEach((word, wi) => {
      tokens.push({
        text: word,
        pi,
        wi,
        globalIdx: tokens.length,
      });
    });
  });
  return tokens;
}

/** Tìm từ tiếng Việt cùng vị trí (câu pi, thứ tự wi) để highlight song song. */
export function viWordIndexForEnToken(viWords, enToken) {
  if (!enToken || enToken.globalIdx < 0) return -1;
  const idx = viWords.findIndex((t) => t.pi === enToken.pi && t.wi === enToken.wi);
  return idx;
}
