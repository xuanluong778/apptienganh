"use client";

import { useEffect, useMemo, useRef } from "react";
import SpeakingModeBar from "@/components/speaking/SpeakingModeBar";
import SpeakingScenarioChips from "@/components/speaking/SpeakingScenarioChips";
import { SPEAKING_SCENARIOS, getScenarioById } from "@/lib/lessons/speaking-scenarios";
import { VOICE_CALL_LEVELS } from "@/lib/lessons/voice-call-levels";

function statusDotClass(phase, api) {
  if (!api?.isOpen) return "voice-call-status--idle";
  if (api.voicePhase === "listening") return "voice-call-status--listen";
  if (api.voicePhase === "speaking") return "voice-call-status--speak";
  if (api.voicePhase === "processing") return "voice-call-status--think";
  if (api.readyState === "connecting") return "voice-call-status--connect";
  if (phase === "active") return "voice-call-status--live";
  return "voice-call-status--idle";
}

export default function VoiceCallRoom({
  phase = "pre",
  api = null,
  sessionMode = "voice_call",
  onSessionModeChange,
  scenarioId = "",
  onScenarioPick,
  levelId = "beginner",
  onLevelChange,
  teacher = null,
  teacherName = "Giáo viên AI",
  teacherEmoji = "🦊",
  onOpenTeacherPicker,
  micMuted = false,
  speakerOn = true,
  onMicToggle,
  onMuteToggle,
  onSpeakerToggle,
  onTranslate,
  onHint,
  onSpeakSlow,
  onStartCall,
  onEndCall,
  onCallAgain,
  translateLoading = false,
}) {
  const transcriptRef = useRef(null);
  const scenario = getScenarioById(scenarioId) || SPEAKING_SCENARIOS[0];
  const level = VOICE_CALL_LEVELS.find((l) => l.id === levelId) || VOICE_CALL_LEVELS[0];

  const transcriptLines = useMemo(() => {
    const lines = (api?.messages || []).filter((m) => m.role === "user" || m.role === "assistant");
    const liveUser = String(api?.liveUserText || "").trim();
    const lastUserText = [...lines].reverse().find((m) => m.role === "user")?.text?.trim() || "";
    if (liveUser && liveUser !== lastUserText) {
      lines.push({ id: "live-user", role: "user", text: liveUser, live: true });
    }
    if (api?.streamingText) {
      lines.push({ id: "live-ai", role: "assistant", text: api.streamingText, live: true });
    }
    return lines;
  }, [api?.liveUserText, api?.messages, api?.streamingText]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines.length, api?.liveUserText, api?.streamingText]);

  const micActive = Boolean(api?.capturing || api?.awaitingRecognitionStart);
  const canUseMic = phase === "active" && api?.isOpen;
  const connecting = phase === "active" && api && !api.isOpen && api.readyState === "connecting";

  return (
    <section className="voice-call-room" aria-label="Voice Call Room">
      <SpeakingModeBar sessionMode={sessionMode} onModeChange={onSessionModeChange} />

      {phase === "pre" ? (
        <div className="voice-call-pre">
          <div className="voice-call-pre__hero">
            <span className="voice-call-pre__emoji" aria-hidden>
              📞
            </span>
            <h2 className="voice-call-pre__title">Gọi thoại với giáo viên AI</h2>
            <p className="voice-call-pre__sub">
              Chọn tình huống và trình độ — bấm một nút để bắt đầu nói chuyện như gọi điện thật.
            </p>
          </div>

          <div className="voice-call-pre__block voice-call-pre__block--teacher">
            <h3 className="voice-call-pre__label">Giáo viên online</h3>
            <button
              type="button"
              className="voice-call-pre__teacher"
              onClick={onOpenTeacherPicker}
              aria-label={`Giáo viên ${teacherName} — chọn giáo viên khác`}
            >
              <span className="voice-call-pre__teacherPhoto">
                {teacher?.portraitUrl ? (
                  <img src={teacher.portraitUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="voice-call-pre__teacherEmoji">{teacherEmoji}</span>
                )}
                <span className="voice-call-pre__teacherOnline" aria-hidden />
              </span>
              <span className="voice-call-pre__teacherMeta">
                <strong>{teacherName}</strong>
                <span>Online · Bấm để chọn giáo viên</span>
              </span>
              <span className="voice-call-pre__teacherChevron" aria-hidden>
                ›
              </span>
            </button>
          </div>

          <div className="voice-call-pre__block">
            <h3 className="voice-call-pre__label">Tình huống luyện tập</h3>
            <SpeakingScenarioChips
              activeScenarioId={scenarioId || scenario.id}
              onPick={onScenarioPick}
              disabled={false}
            />
          </div>

          <div className="voice-call-pre__block">
            <h3 className="voice-call-pre__label">Trình độ của bạn</h3>
            <div className="voice-call-levels" role="radiogroup" aria-label="Trình độ">
              {VOICE_CALL_LEVELS.map((lv) => {
                const active = levelId === lv.id;
                return (
                  <button
                    key={lv.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`voice-call-level${active ? " voice-call-level--active" : ""}`}
                    onClick={() => onLevelChange?.(lv.id)}
                  >
                    <span className="voice-call-level__name">{lv.label}</span>
                    <span className="voice-call-level__hint">{lv.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" className="voice-call-start-btn" onClick={onStartCall}>
            <span aria-hidden>📞</span> Bắt đầu gọi
          </button>
        </div>
      ) : null}

      {phase === "active" || phase === "post" ? (
        <div className={`voice-call-live${phase === "post" ? " voice-call-live--ended" : ""}`}>
          <header className="voice-call-live__head">
            <button
              type="button"
              className="voice-call-avatar voice-call-avatar--clickable"
              onClick={onOpenTeacherPicker}
              aria-label={`${teacherName} đang online — chọn giáo viên`}
            >
              <span className="voice-call-avatar__ring" />
              {teacher?.portraitUrl ? (
                <img
                  className="voice-call-avatar__photo"
                  src={teacher.portraitUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="voice-call-avatar__emoji">{teacherEmoji}</span>
              )}
              <span className="voice-call-avatar__online" aria-hidden />
            </button>
            <div className="voice-call-live__meta">
              <button
                type="button"
                className="voice-call-live__nameBtn"
                onClick={onOpenTeacherPicker}
              >
                <h2 className="voice-call-live__name">{teacherName}</h2>
                <span className="voice-call-live__onlineTag">Online</span>
              </button>
              <p className="voice-call-live__scenario">
                {scenario.emoji} {scenario.label} · {level.label}
              </p>
              <p className={`voice-call-status ${statusDotClass(phase, api)}`}>
                <span className="voice-call-status__dot" aria-hidden />
                {connecting
                  ? "Đang kết nối cuộc gọi…"
                  : phase === "post"
                  ? "Cuộc gọi đã kết thúc"
                  : api?.statusLabel || "Đang trong cuộc gọi"}
              </p>
            </div>
          </header>

          {(api?.micError || api?.authError) && phase === "active" ? (
            <p className="voice-call-error" role="alert">
              {api.authError || api.micError}
            </p>
          ) : null}

          <div className="voice-call-transcript" ref={transcriptRef} aria-live="polite">
            {transcriptLines.length === 0 ? (
              <p className="voice-call-transcript__empty">
                {phase === "post"
                  ? "Cuộc gọi đã kết thúc — xem đánh giá bên phải."
                  : connecting
                  ? "Đang kết nối…"
                  : "Giáo viên sẽ chào bạn — hãy bấm micro và nói tiếng Anh."}
              </p>
            ) : (
              transcriptLines.map((m) => (
                <div
                  key={m.id}
                  className={`voice-call-bubble voice-call-bubble--${m.role}${m.live ? " voice-call-bubble--live" : ""}`}
                >
                  <span className="voice-call-bubble__who">
                    {m.role === "user" ? "Bạn" : teacherName}
                  </span>
                  <p>{m.text}</p>
                </div>
              ))
            )}
          </div>

          {phase === "active" ? (
            <>
              <div className="voice-call-controls" aria-label="Điều khiển cuộc gọi">
                <button
                  type="button"
                  className={`voice-call-ctrl${micMuted ? " voice-call-ctrl--off" : ""}`}
                  onClick={onMuteToggle}
                  title="Tắt / bật micro"
                >
                  <span aria-hidden>{micMuted ? "🔇" : "🎙️"}</span>
                  <span>Tắt mic</span>
                </button>
                <button
                  type="button"
                  className={`voice-call-ctrl${!speakerOn ? " voice-call-ctrl--off" : ""}`}
                  onClick={onSpeakerToggle}
                  title="Tắt / bật loa"
                >
                  <span aria-hidden>{speakerOn ? "🔊" : "🔈"}</span>
                  <span>Loa</span>
                </button>
                <button
                  type="button"
                  className="voice-call-ctrl"
                  onClick={onTranslate}
                  disabled={translateLoading}
                >
                  <span aria-hidden>🇻🇳</span>
                  <span>{translateLoading ? "…" : "Dịch"}</span>
                </button>
                <button type="button" className="voice-call-ctrl" onClick={onHint}>
                  <span aria-hidden>💡</span>
                  <span>Gợi ý</span>
                </button>
                <button type="button" className="voice-call-ctrl" onClick={onSpeakSlow}>
                  <span aria-hidden>🐢</span>
                  <span>Nói chậm</span>
                </button>
                <button type="button" className="voice-call-ctrl voice-call-ctrl--end" onClick={onEndCall}>
                  <span aria-hidden>📵</span>
                  <span>Kết thúc</span>
                </button>
              </div>

              <div className="voice-call-mic-stage">
                <button
                  type="button"
                  className={`voice-call-mic${micActive ? " voice-call-mic--active" : ""}${!canUseMic ? " voice-call-mic--disabled" : ""}`}
                  onClick={onMicToggle}
                  disabled={!canUseMic}
                  aria-pressed={micActive}
                  aria-label={micActive ? "Đang nghe — bấm để gửi" : "Bấm để nói"}
                >
                  <span className="voice-call-mic__icon" aria-hidden>
                    🎤
                  </span>
                  <span className="voice-call-mic__label">
                    {connecting
                      ? "Đang kết nối…"
                      : micActive
                      ? "Đang nghe… bấm để gửi"
                      : api?.ttsPlaying
                      ? "Bấm để nói tiếp"
                      : "Bấm để nói"}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="voice-call-post-actions">
              <button type="button" className="voice-call-start-btn voice-call-start-btn--ghost" onClick={onCallAgain}>
                Gọi lại
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
