/** Parse stored multi-line AI reply from lesson_chat_logs. */
export function parseComposedAiReply(composed) {
  const raw = String(composed || "").trim();
  if (!raw) {
    return {
      text: "",
      correctedSentence: "",
      ipa: "",
      tip: "",
      mistakesExplanation: "",
    };
  }

  const lines = raw.split("\n");
  const text = String(lines[0] || "").trim();
  let correctedSentence = "";
  let ipa = "";
  let tip = "";
  let mistakesExplanation = "";

  for (let i = 1; i < lines.length; i += 1) {
    const line = String(lines[i] || "").trim();
    if (line.startsWith("Notes: ")) mistakesExplanation = line.slice(7).trim();
    else if (line.startsWith("Corrected: ")) correctedSentence = line.slice(11).trim();
    else if (line.startsWith("IPA: ")) ipa = line.slice(5).trim();
    else if (line.startsWith("Tip: ")) tip = line.slice(5).trim();
  }

  return { text, correctedSentence, ipa, tip, mistakesExplanation };
}

export function assistantFromApiData(data, fallbackReply = "Good effort! Please try one more sentence.") {
  const reply = String(data?.reply || fallbackReply || "").trim() || fallbackReply;
  return {
    text: reply,
    correctedSentence: String(data?.corrected_sentence || "").trim(),
    ipa: String(data?.ipa || "").trim(),
    tip: String(data?.pronunciation_tip || "").trim(),
    mistakesExplanation: String(data?.mistakes_explanation || "").trim(),
  };
}

export function createAssistantChatMessage(data, fallbackReply, options = {}) {
  const fields = assistantFromApiData(data, fallbackReply);
  return {
    id: `${Date.now()}-a`,
    role: "assistant",
    text: fields.text,
    correctedSentence: fields.correctedSentence,
    ipa: fields.ipa,
    tip: fields.tip,
    mistakesExplanation: fields.mistakesExplanation,
    userQuestion: String(options.userQuestion || "").trim(),
    detailsOpen: false,
    showVi: false,
    viText: "",
    viLoading: false,
  };
}
