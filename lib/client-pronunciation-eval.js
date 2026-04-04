/** Shared browser-side pronunciation scoring (no Azure). */

export function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function scoreText(a, b) {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  const distance = editDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, Math.round((1 - distance / maxLen) * 100));
}

export function tokenizeWords(input) {
  return normalizeText(input)
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Gợi ý lỗi rõ ràng khi nhận dạng giọng nói (không có Azure). */
export function buildSpeechCompareDetails(transcript, target, { isSentence = false } = {}) {
  const rawSpoken = String(transcript || "").trim();
  const rawTarget = String(target || "").trim();
  if (!rawTarget) return "";
  if (!rawSpoken) {
    return "Không nghe được lời nói. Hãy đọc to hơn, gần micro và giảm tiếng ồn.";
  }
  const t = normalizeText(rawSpoken);
  const tgt = normalizeText(rawTarget);
  if (t === tgt) return "";
  if (!isSentence) {
    return `Lệch so với mục tiêu: bạn đọc giống "${rawSpoken}" — cần đọc "${rawTarget}".`;
  }
  return `Một phần câu chưa khớp. Bạn nói: "${rawSpoken.slice(0, 120)}${rawSpoken.length > 120 ? "…" : ""}" — so với câu mẫu.`;
}

export function buildLocalPhonemeGroups(target, expectedIpaText, transcript) {
  const targetWords = tokenizeWords(target);
  const spokenWords = tokenizeWords(transcript);
  const ipaTokens = String(expectedIpaText || "")
    .trim()
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return targetWords.map((word, idx) => {
    const spoken = spokenWords[idx] || "";
    const wordScore = scoreText(spoken, word);
    const ipaToken = ipaTokens[idx] || "";
    const inside = ipaToken.replace(/^\/|\/$/g, "");
    const phonemes = inside
      ? inside
          .split(/(?=ˈ|ˌ)/)
          .join("")
          .split(/(?=[a-zɪʊʌəɚɝæɑɔeiojuθðʃʒŋtʃdʒ])/i)
          .map((p) => p.trim())
          .filter(Boolean)
      : [word];
    const chips = phonemes.map((ph) => ({
      word,
      phoneme: ph,
      score: wordScore,
    }));
    return { word, phonemes: chips };
  });
}

export function evaluatePronunciation(transcript, target, { isSentence = false, expectedIpaText = "" } = {}) {
  const textScore = scoreText(transcript, target);
  const targetWords = tokenizeWords(target);
  const spokenWords = tokenizeWords(transcript);

  if (!isSentence) {
    const strictPenalty = spokenWords.length > 1 ? 18 : 0;
    const score = Math.max(0, Math.round(textScore - strictPenalty));
    const message =
      score >= 90
        ? "Phát âm chuẩn, rất giống người bản xứ."
        : score >= 75
        ? "Khá tốt, cần rõ hơn âm cuối."
        : score >= 60
        ? "Tạm ổn, nghe lại và kéo dài đúng trọng âm."
        : "Chưa chuẩn. Hãy nghe mẫu, đọc chậm theo từng âm.";
    const compare = buildSpeechCompareDetails(transcript, target, { isSentence: false });
    const details =
      compare ||
      (score < 72
        ? "Điểm chưa cao: bấm nghe mẫu và đọc lại chậm theo IPA phía trên."
        : "");
    return {
      score,
      message,
      details,
      phonemeGroups: buildLocalPhonemeGroups(target, expectedIpaText, transcript),
    };
  }

  const missing = [];
  for (const w of targetWords) {
    if (!spokenWords.includes(w)) missing.push(w);
  }
  const extra = [];
  for (const w of spokenWords) {
    if (!targetWords.includes(w)) extra.push(w);
  }

  const missingPenalty = Math.min(30, missing.length * 8);
  const extraPenalty = Math.min(20, extra.length * 5);
  const score = Math.max(0, Math.round(textScore - missingPenalty - extraPenalty));

  let details = "";
  if (missing.length) details += `Thiếu từ: ${missing.slice(0, 4).join(", ")}. `;
  if (extra.length) details += `Dư từ: ${extra.slice(0, 4).join(", ")}.`;
  details = details.trim();
  const compare = buildSpeechCompareDetails(transcript, target, { isSentence: true });
  if (compare) {
    details = details ? `${details} ${compare}` : compare;
  }

  const message =
    score >= 88
      ? "Câu đọc rất tốt, ngữ điệu ổn."
      : score >= 72
      ? "Khá tốt, chỉnh thêm vài từ để tự nhiên hơn."
      : score >= 58
      ? "Cần luyện thêm nhịp câu và trọng âm."
      : "Chưa đạt. Chia câu thành cụm ngắn rồi đọc lại.";
  return {
    score,
    message,
    details,
    phonemeGroups: buildLocalPhonemeGroups(target, expectedIpaText, transcript),
  };
}
