/** Client-side fallback when /api/ai-call/evaluate unavailable (no OpenAI on client). */

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 70;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function clientEvaluateSpeech({ spokenText, targetSentence = "" }) {
  const said = String(spokenText || "").trim();
  const target = String(targetSentence || "").trim();

  if (!said) {
    return {
      is_correct: false,
      you_said: "",
      correct_sentence: target,
      why_wrong: ["Không nghe thấy giọng nói — hãy bấm micro và nói rõ hơn."],
      say_again: target,
      teacher_reply: "I didn't hear you. Please try again.",
      scores: { pronunciation: 0, grammar: 0, naturalness: 0 },
    };
  }

  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const close = target && norm(said) === norm(target);
  const partial = target && norm(said).includes(norm(target).slice(0, Math.min(8, target.length)));

  return {
    is_correct: close,
    you_said: said,
    correct_sentence: target || said,
    why_wrong: close
      ? []
      : [
          "Câu chưa khớp hoàn toàn với mẫu — kiểm tra từ vựng và dấu câu.",
          partial ? "Bạn đã gần đúng — thử nói chậm và rõ hơn." : "Hãy nghe lại câu mẫu rồi nói lại.",
        ],
    say_again: target || said,
    teacher_reply: close
      ? "Great job! Let's try the next sentence."
      : "Good try! Listen once more and say it again slowly.",
    scores: {
      pronunciation: clampScore(close ? 88 : partial ? 72 : 58),
      grammar: clampScore(close ? 90 : 65),
      naturalness: clampScore(close ? 85 : 62),
    },
  };
}
