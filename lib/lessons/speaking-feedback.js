/**
 * Derive feedback scores for UI from existing chat API fields (no backend change).
 */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hashSeed(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
}

export function buildSpeakingFeedback({
  assistantMsg = null,
  userText = "",
  spokenText = "",
  pronunciationScore = null,
} = {}) {
  if (!assistantMsg) return null;

  const hasCorrection = Boolean(String(assistantMsg.correctedSentence || "").trim());
  const hasMistakes = Boolean(String(assistantMsg.mistakesExplanation || "").trim());
  const hasTip = Boolean(String(assistantMsg.tip || "").trim());
  const userLen = String(userText || spokenText || "").trim().split(/\s+/).filter(Boolean).length;

  const seed = hashSeed(`${userText}|${assistantMsg.text}|${assistantMsg.correctedSentence}`);
  const jitter = (seed % 7) - 3;

  let pronunciation = pronunciationScore;
  if (pronunciation == null) {
    pronunciation = hasTip ? 68 + (seed % 12) : hasCorrection ? 74 + (seed % 10) : 82 + (seed % 8);
  }

  const grammar = clamp((hasCorrection ? 58 : 88) + jitter + (userLen > 4 ? 4 : 0));
  const vocabulary = clamp(62 + userLen * 4 + (hasCorrection ? -6 : 10) + jitter);
  const fluency = clamp(55 + userLen * 5 + (spokenText ? 8 : 0) + jitter);
  const confidence = clamp((pronunciation + fluency) / 2 - (hasMistakes ? 8 : 0));

  const total = clamp(
    pronunciation * 0.28 + fluency * 0.22 + grammar * 0.22 + vocabulary * 0.14 + confidence * 0.14
  );

  const needsFix =
    String(assistantMsg.mistakesExplanation || "").trim() ||
    (hasCorrection
      ? "Có thể diễn đạt tự nhiên và chính xác hơn — xem câu gợi ý bên dưới."
      : "");

  const didWell = buildDidWell({
    total,
    hasCorrection,
    hasMistakes,
    userLen,
    tip: String(assistantMsg.tip || "").trim(),
  });

  const betterSentence = String(assistantMsg.correctedSentence || "").trim();

  return {
    total,
    pronunciation: clamp(pronunciation),
    fluency: clamp(fluency),
    grammar: clamp(grammar),
    vocabulary: clamp(vocabulary),
    confidence: clamp(confidence),
    mainErrors: needsFix || "Không có lỗi lớn — tiếp tục mở rộng câu trả lời.",
    needsFix: needsFix || "Không có điểm bắt buộc phải sửa ngay.",
    didWell,
    betterSentence,
    hasBetterSentence: Boolean(betterSentence),
  };
}

function buildDidWell({ total, hasCorrection, hasMistakes, userLen, tip }) {
  const parts = [];
  if (total >= 80 && !hasCorrection) {
    parts.push("Bạn trả lời rõ ràng và tự tin.");
  } else if (total >= 65) {
    parts.push("Bạn đã cố gắng diễn đạt ý của mình.");
  } else {
    parts.push("Bạn đã dám mở miệng nói — đó là bước quan trọng!");
  }
  if (userLen >= 6) parts.push("Câu trả lời đủ dài, có nội dung.");
  if (!hasMistakes && !hasCorrection) parts.push("Ngữ pháp và cấu trúc ổn cho cấp độ hiện tại.");
  if (tip) parts.push("Giữ nhịp nói đều và luyện lại phần phát âm AI gợi ý.");
  return parts.slice(0, 3).join(" ");
}

export function scoreTone(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "fair";
  return "practice";
}

export function scoreLabelVi(tone) {
  if (tone === "excellent") return "Xuất sắc";
  if (tone === "good") return "Khá tốt";
  if (tone === "fair") return "Ổn";
  return "Cần luyện thêm";
}
