"use client";

import SpeakingFeedbackCard from "@/components/speaking/SpeakingFeedbackCard";
import { getAnswerSuggestions } from "@/lib/lessons/speaking-suggestions";
import VoiceCallTutorCard from "./VoiceCallTutorCard";

export default function VoiceCallCoachPanel({
  phase = "pre",
  api = null,
  summary = null,
  scenarioLabel = "",
  levelLabel = "",
  translateText = "",
  hints = [],
  teacher = null,
  onOpenTeacherPicker,
  onSpeakText,
  onCallAgain,
}) {
  const lastAssistant = [...(api?.messages || [])].reverse().find((m) => m.role === "assistant");
  const turnCount = summary?.turnCount ?? (api?.messages || []).filter((m) => m.role === "user").length;
  const liveHints =
    hints.length > 0
      ? hints
      : getAnswerSuggestions(lastAssistant?.text || "", "");

  if (phase === "pre") {
    return (
      <aside className="voice-call-coach" aria-label="Coach Panel">
        <VoiceCallTutorCard teacher={teacher} onClick={onOpenTeacherPicker} />

        <div className="voice-call-coach__portrait" aria-hidden>
          {teacher?.portraitUrl ? (
            <img src={teacher.portraitUrl} alt="" loading="lazy" decoding="async" />
          ) : null}
        </div>

        <div className="voice-call-coach__card voice-call-coach__card--tips">
          <h3 className="voice-call-coach__title">💡 Mẹo trước khi gọi</h3>
          <ul className="voice-call-coach__list">
            <li>Chọn tình huống quen thuộc — dễ nói tự nhiên hơn.</li>
            <li>Dùng tai nghe nếu có — âm thanh rõ và ít ồn.</li>
            <li>Bấm micro, nói xong rồi bấm lại để gửi câu trả lời.</li>
            <li>Không hiểu? Bấm <strong>Gợi ý</strong> hoặc <strong>Nói chậm</strong>.</li>
          </ul>
        </div>
        <div className="voice-call-coach__card">
          <h3 className="voice-call-coach__title">📋 Chuẩn bị</h3>
          <p className="voice-call-coach__copy">
            {scenarioLabel
              ? `Tình huống: ${scenarioLabel}${levelLabel ? ` · ${levelLabel}` : ""}`
              : "Chọn tình huống và trình độ bên trái, rồi bấm Bắt đầu gọi."}
          </p>
        </div>
      </aside>
    );
  }

  if (phase === "active") {
    return (
      <aside className="voice-call-coach" aria-label="Coach Panel">
        <VoiceCallTutorCard teacher={teacher} onClick={onOpenTeacherPicker} compact />

        <div className="voice-call-coach__card voice-call-coach__card--live">
          <h3 className="voice-call-coach__title">🎯 Trạng thái</h3>
          <p className="voice-call-coach__status">{api?.statusLabel || "Đang kết nối…"}</p>
          <p className="voice-call-coach__meta">
            Đã nói <strong>{turnCount}</strong> lượt
            {scenarioLabel ? ` · ${scenarioLabel}` : ""}
          </p>
        </div>

        {translateText ? (
          <div className="voice-call-coach__card">
            <h3 className="voice-call-coach__title">🇻🇳 Dịch nghĩa</h3>
            <p className="voice-call-coach__copy">{translateText}</p>
          </div>
        ) : null}

        {liveHints.length > 0 ? (
          <div className="voice-call-coach__card">
            <h3 className="voice-call-coach__title">💬 Gợi ý trả lời</h3>
            <div className="voice-call-coach__hints">
              {liveHints.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="voice-call-coach__hint-btn"
                  onClick={() => onSpeakText?.(h, 0.88)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="voice-call-coach__card voice-call-coach__card--soft">
          <h3 className="voice-call-coach__title">✨ Coach nhắc nhở</h3>
          <p className="voice-call-coach__copy">
            Nói câu đầy đủ, không chỉ một từ. Nếu giáo viên đang nói, bấm micro để xen vào lịch sự.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="voice-call-coach" aria-label="Coach Panel">
      <SpeakingFeedbackCard
        feedback={summary}
        onSpeakBetter={(t) => onSpeakText?.(t, 0.88)}
        onRetrySpeak={onCallAgain}
        onContinue={onCallAgain}
        showActions
        actionsDisabled={false}
      />

      {summary?.nextLesson ? (
        <div className="voice-call-coach__card voice-call-coach__card--next">
          <h3 className="voice-call-coach__title">📚 Bài luyện tiếp theo</h3>
          <p className="voice-call-coach__copy">{summary.nextLesson}</p>
          <button type="button" className="voice-call-coach__cta" onClick={onCallAgain}>
            Gọi lại ngay →
          </button>
        </div>
      ) : null}
    </aside>
  );
}
