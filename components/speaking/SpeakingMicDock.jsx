"use client";

const MAX_RECORD_SEC = 30;

export default function SpeakingMicDock({
  recording = false,
  recordSecs = 0,
  speechSupported,
  voiceNotice,
  onMic,
  inputDisabled,
}) {
  const elapsed = String(recordSecs).padStart(2, "0");
  const max = String(MAX_RECORD_SEC).padStart(2, "0");

  return (
    <div className="speaking-mic-dock">
      {speechSupported === false ? (
        <p className="speaking-voice-notice speaking-voice-notice--warn" role="status">
          Dùng Chrome hoặc Edge để bật micro.
        </p>
      ) : null}
      {speechSupported !== false && voiceNotice ? (
        <p className="speaking-voice-notice" role="status" aria-live="polite">
          {voiceNotice}
        </p>
      ) : null}

      <div className={`speaking-mic-dock__pulse${recording ? " speaking-mic-dock__pulse--on" : ""}`}>
        <span className="speaking-mic-dock__ring speaking-mic-dock__ring--1" aria-hidden />
        <span className="speaking-mic-dock__ring speaking-mic-dock__ring--2" aria-hidden />
        <button
          type="button"
          className={`speaking-mic-btn${recording ? " speaking-mic-btn--recording" : ""}`}
          onClick={onMic}
          disabled={speechSupported === false || (inputDisabled && !recording)}
          aria-pressed={recording}
          aria-label={recording ? "Dừng ghi âm" : "Bấm để nói"}
        >
          {recording ? "⏹" : "🎤"}
        </button>
      </div>

      <p className="speaking-mic-timer" aria-live="polite">
        {recording ? `${elapsed} / ${max}` : "Bấm micro để nói"}
      </p>
    </div>
  );
}
