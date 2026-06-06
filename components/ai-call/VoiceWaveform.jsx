"use client";

export default function VoiceWaveform({ active = false }) {
  return (
    <div className={`ai-voice-wave${active ? " ai-voice-wave--active" : ""}`} aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span key={i} className="ai-voice-wave__bar" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
