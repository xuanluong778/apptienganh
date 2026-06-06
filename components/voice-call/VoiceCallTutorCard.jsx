"use client";

import { getTeacherVoiceName } from "@/lib/lessons/ai-teachers";

export default function VoiceCallTutorCard({ teacher, onClick, disabled = false, compact = false }) {
  if (!teacher) return null;
  const name = getTeacherVoiceName(teacher);

  return (
    <button
      type="button"
      className={`voice-tutor-card${compact ? " voice-tutor-card--compact" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Giáo viên ${name} — bấm để chọn giáo viên khác`}
    >
      <div className="voice-tutor-card__photo">
        <img src={teacher.portraitUrl} alt="" loading="lazy" decoding="async" />
        {teacher.online ? <span className="voice-tutor-card__online" aria-hidden /> : null}
      </div>
      <div className="voice-tutor-card__meta">
        <span className="voice-tutor-card__label">GIA SƯ CỦA BẠN</span>
        <strong className="voice-tutor-card__name">{name}</strong>
        <span className="voice-tutor-card__status">{teacher.online ? "Online" : "Offline"}</span>
      </div>
      <span className="voice-tutor-card__chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}
