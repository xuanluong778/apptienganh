/** Tình huống luyện nói — chip gợi ý sẵn (UI only, prompt gửi qua /api/lessons/chat). */
export const SPEAKING_SCENARIOS = [
  {
    id: "greeting",
    label: "Chào hỏi",
    emoji: "👋",
    prompt: "Let's practice a simple daily greeting conversation in English.",
  },
  {
    id: "ordering",
    label: "Gọi món",
    emoji: "🍽️",
    prompt: "Let's role-play ordering food at a restaurant in English.",
  },
  {
    id: "directions",
    label: "Hỏi đường",
    emoji: "🗺️",
    prompt: "Practice asking for directions while traveling in English.",
  },
  {
    id: "shopping",
    label: "Mua sắm",
    emoji: "🛍️",
    prompt: "Let's practice shopping English: asking prices, sizes, and paying.",
  },
  {
    id: "interview",
    label: "Phỏng vấn",
    emoji: "💼",
    prompt: "Ask me common job interview questions in English and help me answer naturally.",
  },
  {
    id: "work",
    label: "Công việc",
    emoji: "🏢",
    prompt: "Help me practice workplace English: meetings, emails, and talking to colleagues.",
  },
  {
    id: "travel",
    label: "Du lịch",
    emoji: "✈️",
    prompt: "Let's practice travel English: airport, hotel, and asking for help.",
  },
  {
    id: "ielts",
    label: "IELTS",
    emoji: "📝",
    prompt: "Practice IELTS Speaking Part 1 style questions with natural follow-up questions.",
  },
];

export function getScenarioById(id) {
  return SPEAKING_SCENARIOS.find((s) => s.id === id) || null;
}
