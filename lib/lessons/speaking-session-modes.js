/** Chế độ phiên luyện nói — UI only, không đổi API. */

export const SESSION_MODES = [
  {
    id: "quick_5",
    label: "Luyện nhanh 5 phút",
    shortLabel: "5 phút",
    emoji: "⏱️",
    hint: "Câu hỏi ngắn, một lượt một câu — tối đa 5 phút.",
  },
  {
    id: "scenario",
    label: "Đàm thoại theo tình huống",
    shortLabel: "Tình huống",
    emoji: "💬",
    hint: "Chọn tình huống thực tế và đàm thoại song song với AI.",
  },
  {
    id: "voice_call",
    label: "Gọi thoại AI",
    shortLabel: "Gọi thoại",
    emoji: "📞",
    hint: "Gọi thoại trực tiếp với giáo viên AI Beego.",
  },
];

export const QUICK_5_SECONDS = 5 * 60;

export const QUICK_5_START_PROMPT =
  "Let's do a quick 5-minute English speaking warm-up. Ask me one simple question at a time about daily life. Keep it short and friendly.";

export const EASIER_SPEAK_PROMPT =
  "Could you please ask me an easier question or use simpler English words?";

export const RESCUE_PHRASES = [
  { id: "not_sure", label: "I'm not sure", text: "I'm not sure." },
  { id: "repeat", label: "Can you repeat that?", text: "Can you repeat that?" },
  { id: "think", label: "Let me think", text: "Let me think for a moment." },
];

export function normalizeSessionMode(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (key === "quick_5" || key === "quick5" || key === "quick") return "quick_5";
  if (key === "voice_call" || key === "voice" || key === "call") return "voice_call";
  return "scenario";
}

export function getSessionModeMeta(id) {
  const norm = normalizeSessionMode(id);
  return SESSION_MODES.find((m) => m.id === norm) || SESSION_MODES[1];
}

export function formatQuickTimer(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
