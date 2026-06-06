export default function VoiceButton({ recording, onClick, label = "Bấm để nói", ariaLabel }) {
  return (
    <button
      type="button"
      className={`beego-voice-btn ${recording ? "beego-voice-btn--recording" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel || (recording ? "Đang ghi âm, bấm để dừng" : label)}
      aria-pressed={recording}
    >
      {recording ? "⏹" : "🎙️"}
    </button>
  );
}
