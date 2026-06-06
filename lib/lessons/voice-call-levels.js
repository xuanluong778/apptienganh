export const VOICE_CALL_LEVELS = [
  { id: "beginner", label: "Mới bắt đầu", hint: "Câu ngắn, từ đơn giản" },
  { id: "intermediate", label: "Trung cấp", hint: "Hội thoại tự nhiên hơn" },
  { id: "advanced", label: "Nâng cao", hint: "Tốc độ & từ vựng phong phú" },
];

export function getVoiceCallLevel(id) {
  return VOICE_CALL_LEVELS.find((l) => l.id === id) || VOICE_CALL_LEVELS[0];
}
