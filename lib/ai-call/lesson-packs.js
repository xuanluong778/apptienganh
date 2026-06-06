/** Bài mẫu cho Gọi thoại AI — UI + gợi ý evaluate. */

export const AI_CALL_LESSON_PACKS = [
  {
    id: "basic_greeting",
    title: "Basic Greeting",
    titleVi: "Chào hỏi cơ bản",
    level: "A1",
    scenarioId: "greeting",
    lines: [
      {
        en: "Nice to meet you.",
        vi: "Rất vui được gặp bạn.",
        hint: "Dùng khi gặp ai đó lần đầu — nói rõ từng âm tiết.",
        goals: ["Nghe câu mẫu", "Nói lại đúng", "Dùng trong hội thoại thật"],
      },
      {
        en: "Hello, my name is Linh.",
        vi: "Xin chào, tôi tên là Linh.",
        hint: "Giới thiệu tên — nhấn mạnh My name is…",
        goals: ["Nghe câu mẫu", "Nói lại đúng", "Thay tên của bạn"],
      },
      {
        en: "How are you today?",
        vi: "Hôm nay bạn khỏe không?",
        hint: "Câu hỏi thân mật — giọng lên cuối câu.",
        goals: ["Nghe câu mẫu", "Nói lại đúng", "Trả lời I'm fine"],
      },
      {
        en: "Goodbye, see you later.",
        vi: "Tạm biệt, hẹn gặp lại sau.",
        hint: "Nhớ dấu phẩy giữa Goodbye và see you later.",
        goals: ["Nghe câu mẫu", "Nói lại đúng", "Dùng khi chia tay"],
      },
    ],
  },
  {
    id: "daily_chat",
    title: "Daily Chat",
    titleVi: "Trò chuyện hàng ngày",
    level: "A2",
    scenarioId: "greeting",
    lines: [
      {
        en: "What did you do today?",
        vi: "Hôm nay bạn đã làm gì?",
        hint: "Past simple — nói một hoạt động đơn giản.",
        goals: ["Nghe câu mẫu", "Trả lời 1 câu", "Dùng I went / I studied"],
      },
      {
        en: "I like learning English.",
        vi: "Tôi thích học tiếng Anh.",
        hint: "Like + V-ing hoặc like + noun.",
        goals: ["Nghe câu mẫu", "Nói lại đúng", "Thay sở thích của bạn"],
      },
    ],
  },
];

export function getLessonPackByScenario(scenarioId) {
  const id = String(scenarioId || "").trim();
  return AI_CALL_LESSON_PACKS.find((p) => p.scenarioId === id) || AI_CALL_LESSON_PACKS[0];
}

export function getLessonPackById(packId) {
  return AI_CALL_LESSON_PACKS.find((p) => p.id === packId) || AI_CALL_LESSON_PACKS[0];
}
