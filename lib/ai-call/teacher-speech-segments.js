/** Build bilingual TTS segments for AI teacher voice flow. */

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

/**
 * @param {object} evaluation
 * @param {{ en?: string, vi?: string }} currentLine
 * @returns {{ lang: 'vi'|'en', text: string }[]}
 */
export function buildTeacherSpeechSegments(evaluation, currentLine = {}) {
  if (!evaluation) return [];

  if (evaluation.is_correct) {
    const parts = [{ lang: "vi", text: "Rất tốt! Bạn nói đúng rồi. Hãy tiếp tục nhé!" }];
    const reply = clean(evaluation.teacher_reply);
    if (reply) parts.push({ lang: "en", text: reply });
    return parts;
  }

  const youSaid = clean(evaluation.you_said);
  const correct = clean(evaluation.correct_sentence || currentLine.en);
  const sayAgain = clean(evaluation.say_again || correct);
  const meaningVi = clean(currentLine.vi);
  const why = Array.isArray(evaluation.why_wrong)
    ? evaluation.why_wrong.map(clean).filter(Boolean)
    : [];

  const viParts = [];
  if (youSaid) viParts.push(`Bạn đã nói: ${youSaid}.`);
  if (why.length) viParts.push(why.join(" "));
  else viParts.push("Câu này chưa đúng hoàn toàn — mình sửa giúp bạn nhé.");
  if (meaningVi) viParts.push(`Nghĩa câu tiếng Việt là: ${meaningVi}.`);
  if (correct) viParts.push(`Câu đúng bằng tiếng Anh là: ${correct}.`);
  viParts.push("Bây giờ hãy nghe và nói lại nhé!");

  const segments = [{ lang: "vi", text: viParts.join(" ") }];

  if (sayAgain) segments.push({ lang: "en", text: sayAgain });

  const reply = clean(evaluation.teacher_reply);
  if (reply) segments.push({ lang: "en", text: reply });

  return segments.filter((s) => s.text);
}

/** Nghe nghĩa tiếng Việt + đọc lại câu đúng */
export function buildListenCorrectSegments(correctEn, meaningVi = "") {
  const correct = clean(correctEn);
  if (!correct) return [];

  const segments = [];
  const meaning = clean(meaningVi);
  if (meaning) {
    segments.push({ lang: "vi", text: `Nghĩa câu tiếng Việt là: ${meaning}.` });
  }
  segments.push({ lang: "vi", text: "Nghe và đọc lại câu đúng:" });
  segments.push({ lang: "en", text: correct });
  return segments;
}

export function buildWelcomeSegments(teacherName, sampleEn, sampleVi = "") {
  const meaning = clean(sampleVi);
  const viIntro = meaning
    ? `Xin chào! Câu hôm nay có nghĩa là: ${meaning}. Hãy bấm micro và nói lại câu mẫu bằng tiếng Anh nhé!`
    : "Xin chào! Hãy bấm micro và nói lại câu mẫu bằng tiếng Anh nhé!";
  return [
    { lang: "vi", text: viIntro },
    { lang: "en", text: `Hi! I'm ${teacherName}. Let's practice together.` },
    { lang: "en", text: sampleEn || "Nice to meet you." },
  ];
}

export function buildSampleLineSegments(lineEn, lineVi = "") {
  const meaning = clean(lineVi);
  return [
    {
      lang: "vi",
      text: meaning ? `Nghĩa câu: ${meaning}. Nghe câu mẫu:` : "Nghe câu mẫu:",
    },
    { lang: "en", text: lineEn },
  ];
}

export function segmentsToSubtitle(segments) {
  return segments.map((s) => s.text).join(" · ");
}
