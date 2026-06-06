"use client";

import { useLipSyncAvatar } from "@/hooks/useLipSyncAvatar";

const STATUS_LABELS = {
  idle: "Sẵn sàng",
  listening: "Đang nghe học viên…",
  thinking: "Đang phân tích…",
  speaking: "Đang nói",
  correcting: "Đang sửa lỗi",
  encouraging: "Động viên",
};

export default function AITeacherAvatar({
  teacher,
  teacherStatus = "idle",
  isSpeaking = false,
  audioEl = null,
  animated = true,
  onOpenTeacherPicker,
  waveformAnalyser = null,
}) {
  const { mouthOpen, blinking, nodding, pointing, expression } = useLipSyncAvatar({
    audioEl,
    isSpeaking,
    teacherStatus,
    animated,
  });

  const statusLabel = STATUS_LABELS[teacherStatus] || STATUS_LABELS.idle;
  const speaking = teacherStatus === "speaking" || teacherStatus === "correcting" || isSpeaking;

  return (
    <div className={`ai-teacher-avatar ai-teacher-avatar--${expression}${nodding ? " ai-teacher-avatar--nod" : ""}${pointing ? " ai-teacher-avatar--point" : ""}`}>
      <button type="button" className="ai-teacher-avatar__frame" onClick={onOpenTeacherPicker}>
        <div className="ai-teacher-avatar__head">
          {teacher?.portraitUrl ? (
            <img src={teacher.portraitUrl} alt="" className="ai-teacher-avatar__photo" />
          ) : (
            <span className="ai-teacher-avatar__emoji">{teacher?.emoji || "🐰"}</span>
          )}

          {animated ? (
            <>
              <div className={`ai-teacher-avatar__eyes${blinking ? " ai-teacher-avatar__eyes--blink" : ""}`} aria-hidden>
                <span />
                <span />
              </div>
              <div
                className="ai-teacher-avatar__mouth"
                style={{ transform: `translateX(-50%) scaleY(${0.15 + mouthOpen * 0.85})` }}
                aria-hidden
              />
              {pointing ? <span className="ai-teacher-avatar__hand" aria-hidden /> : null}
            </>
          ) : null}
        </div>

        <span className={`ai-teacher-avatar__badge${speaking ? " ai-teacher-avatar__badge--live" : ""}`}>
          <span className="ai-teacher-avatar__dot" aria-hidden />
          {speaking ? "Đang nói" : "Online"}
        </span>
      </button>

      <p className="ai-teacher-avatar__status">{statusLabel}</p>
      <p className="ai-teacher-avatar__name">{teacher?.voiceName || teacher?.name || "Giáo viên AI"}</p>
    </div>
  );
}
