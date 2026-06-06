"use client";

export default function TeacherSubtitle({ text = "", isSpeaking = false, provider = "" }) {
  if (!text) return null;

  return (
    <div className={`ai-teacher-subtitle${isSpeaking ? " ai-teacher-subtitle--live" : ""}`} aria-live="polite">
      <span className="ai-teacher-subtitle__icon" aria-hidden>
        {isSpeaking ? "🔊" : "💬"}
      </span>
      <p>{text}</p>
      {provider ? <span className="ai-teacher-subtitle__provider">{provider}</span> : null}
    </div>
  );
}
