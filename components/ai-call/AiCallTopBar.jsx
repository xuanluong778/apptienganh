"use client";

export default function AiCallTopBar({
  lessonTitle = "Basic Greeting",
  levelLabel = "A1",
  elapsedSec = 0,
  speakerOn = true,
  micMuted = false,
  avatarAnimated = true,
  canReplay = false,
  onSpeakerToggle,
  onMicToggle,
  onAvatarToggle,
  onReplayTeacher,
  onEnd,
  onBack,
}) {
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const timer =
    h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <header className="ai-call-topbar">
      <div className="ai-call-topbar__left">
        <button type="button" className="ai-call-topbar__back" onClick={onBack} aria-label="Quay lại">
          ←
        </button>
        <div className="ai-call-topbar__brand">
          <span className="ai-call-topbar__logo" aria-hidden>
            🐝
          </span>
          <div>
            <strong>Beego AI Call</strong>
            <span>
              {lessonTitle} · {levelLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="ai-call-topbar__center">
        <span className="ai-call-topbar__timer" aria-live="polite">
          {timer}
        </span>
      </div>
      <div className="ai-call-topbar__actions">
        <button
          type="button"
          className={`ai-call-topbar__iconBtn${avatarAnimated ? "" : " ai-call-topbar__iconBtn--off"}`}
          onClick={onAvatarToggle}
          title={avatarAnimated ? "Tắt avatar động" : "Bật avatar động"}
        >
          {avatarAnimated ? "🎭" : "🖼️"}
        </button>
        <button
          type="button"
          className={`ai-call-topbar__iconBtn${canReplay ? "" : " ai-call-topbar__iconBtn--off"}`}
          onClick={onReplayTeacher}
          disabled={!canReplay}
          title="Nghe lại giáo viên"
        >
          ↺
        </button>
        <button
          type="button"
          className={`ai-call-topbar__iconBtn${speakerOn ? "" : " ai-call-topbar__iconBtn--off"}`}
          onClick={onSpeakerToggle}
          title="Loa"
        >
          {speakerOn ? "🔊" : "🔈"}
        </button>
        <button
          type="button"
          className={`ai-call-topbar__iconBtn${micMuted ? " ai-call-topbar__iconBtn--off" : ""}`}
          onClick={onMicToggle}
          title="Micro"
        >
          {micMuted ? "🔇" : "🎙️"}
        </button>
        <button type="button" className="ai-call-topbar__end" onClick={onEnd}>
          Kết thúc
        </button>
      </div>
    </header>
  );
}
