/** Gợi ý trả lời — UI only, từ câu hỏi AI hiện tại. */
export function getAnswerSuggestions(assistantText, correctedSentence = "") {
  const corrected = String(correctedSentence || "").trim();
  if (corrected) return [corrected];

  const t = String(assistantText || "").toLowerCase();
  if (t.includes("name")) {
    return ["My name is…", "Hello, I'm…", "Nice to meet you!"];
  }
  if (t.includes("how are you") || t.includes("how're you")) {
    return ["I'm fine, thank you.", "I'm good, thanks!", "Not bad, and you?"];
  }
  if (t.includes("where") && t.includes("from")) {
    return ["I'm from Vietnam.", "I come from Hanoi.", "I'm Vietnamese."];
  }
  if (t.includes("like") || t.includes("hobby")) {
    return ["I like reading and music.", "In my free time, I enjoy…", "My hobby is…"];
  }
  return ["Let me think…", "That's a good question.", "Well, I think…"];
}
