import { buildSpeakingFeedback } from "@/lib/lessons/speaking-feedback";

/** Tóm tắt sau cuộc gọi — UI only, từ transcript voice. */
export function buildVoiceCallSummary({ messages = [], scenarioLabel = "", levelLabel = "" } = {}) {
  const userMsgs = messages.filter((m) => m.role === "user");
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  const lastUser = userMsgs[userMsgs.length - 1];
  const lastAssistant = assistantMsgs[assistantMsgs.length - 1];

  const fakeAssistant = {
    text: lastAssistant?.text || "Good job practicing today!",
    correctedSentence: "",
    tip: "",
    mistakesExplanation:
      userMsgs.length < 2
        ? "Hãy nói thêm vài câu dài hơn để giáo viên hiểu rõ hơn."
        : "Tiếp tục luyện phát âm cuối từ và nối câu tự nhiên hơn.",
    ipa: "",
  };

  const feedback =
    buildSpeakingFeedback({
      assistantMsg: fakeAssistant,
      userText: lastUser?.text || "",
      spokenText: lastUser?.text || "",
      pronunciationScore: null,
    }) || {
      total: 70,
      pronunciation: 72,
      fluency: 68,
      grammar: 74,
      vocabulary: 70,
      confidence: 71,
      mainErrors: "Hãy nói thêm để nhận phản hồi chi tiết hơn.",
      needsFix: "Thử trả lời bằng câu đầy đủ thay vì một hoặc hai từ.",
      didWell: "Bạn đã hoàn thành cuộc gọi — tiếp tục luyện để tiến bộ nhanh hơn!",
      betterSentence: "",
      hasBetterSentence: false,
    };

  const nextLesson =
    scenarioLabel && levelLabel
      ? `Ôn lại tình huống “${scenarioLabel}” ở mức ${levelLabel} — thêm 3 câu trả lời dài hơn.`
      : "Luyện thêm 5 phút với tình huống Chào hỏi hoặc Gọi món.";

  return {
    ...feedback,
    turnCount: userMsgs.length,
    durationHint: `${Math.max(1, userMsgs.length * 2)} phút (ước lượng)`,
    nextLesson,
  };
}

export function sanitizeVoiceUserMessage(raw) {
  const m = String(raw || "").trim();
  if (!m) return "";
  if (
    /npm run|redis|worker|websocket|ws closed|voice-ws|protocol|azure stt|audioworklet|voice server|127\.0\.0\.1:3001/i.test(
      m
    )
  ) {
    return "Không thể kết nối cuộc gọi. Hãy đảm bảo máy chủ gọi thoại đang chạy, rồi bấm Gọi lại.";
  }
  if (/network_io_suspended|failed to fetch|load failed/i.test(m)) {
    return "Mạng tạm dừng — hãy mở lại tab và thử gọi lại.";
  }
  if (/quota exceeded|upgrade your plan/i.test(m)) {
    return "Bạn đã hết lượt gọi trong gói hiện tại. Vui lòng nâng cấp hoặc thử lại sau.";
  }
  return m;
}
