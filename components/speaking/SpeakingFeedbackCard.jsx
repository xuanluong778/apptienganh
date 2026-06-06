"use client";

import { scoreLabelVi, scoreTone } from "@/lib/lessons/speaking-feedback";

const METRICS = [
  { key: "pronunciation", label: "Phát âm" },
  { key: "fluency", label: "Trôi chảy" },
  { key: "grammar", label: "Ngữ pháp" },
  { key: "vocabulary", label: "Từ vựng" },
  { key: "confidence", label: "Tự tin" },
];

export default function SpeakingFeedbackCard({
  feedback,
  ipaText = "",
  onSpeakBetter,
  onRetrySpeak,
  onContinue,
  actionsDisabled = false,
  showActions = false,
}) {
  if (!feedback) {
    return (
      <div className="speaking-feedback speaking-feedback--empty">
        <span className="speaking-feedback__trophy" aria-hidden>
          🏆
        </span>
        <p>Bấm micro và nói — kết quả chấm điểm sẽ hiện tại đây.</p>
      </div>
    );
  }

  const tone = scoreTone(feedback.total);

  return (
    <div className="speaking-feedback">
      <div className="speaking-feedback__result">
        <span className="speaking-feedback__trophy" aria-hidden>
          🏆
        </span>
        <div>
          <div className="speaking-feedback__total">
            <span className="speaking-feedback__score">{feedback.total}</span>
            <span className="speaking-feedback__score-label">/100</span>
          </div>
          <p className="speaking-feedback__tone">{scoreLabelVi(tone)}</p>
        </div>
      </div>

      <div className="speaking-feedback__metrics">
        {METRICS.map(({ key, label }) => (
          <div key={key} className="speaking-metric">
            <span className="speaking-metric__label">{label}</span>
            <div className="speaking-metric__bar">
              <div className="speaking-metric__fill" style={{ width: `${feedback[key]}%` }} />
            </div>
            <span className="speaking-metric__value">{feedback[key]}</span>
          </div>
        ))}
      </div>

      <div className="speaking-feedback__section speaking-feedback__section--good">
        <h4 className="speaking-feedback__section-title">✅ Bạn làm tốt</h4>
        <p className="speaking-feedback__copy">{feedback.didWell}</p>
      </div>

      <div className="speaking-feedback__section speaking-feedback__section--fix">
        <h4 className="speaking-feedback__section-title">🔧 Cần cải thiện</h4>
        <p className="speaking-feedback__copy">{feedback.needsFix}</p>
      </div>

      {feedback.hasBetterSentence ? (
        <div className="speaking-feedback__section speaking-feedback__section--better">
          <h4 className="speaking-feedback__section-title">✨ Câu tự nhiên hơn</h4>
          <p className="speaking-feedback__better">{feedback.betterSentence}</p>
          {ipaText ? <p className="speaking-feedback__ipa">{ipaText}</p> : null}
          <button
            type="button"
            className="speaking-feedback__speak-btn"
            onClick={() => onSpeakBetter?.(feedback.betterSentence)}
          >
            🔊 Nghe câu mẫu
          </button>
        </div>
      ) : null}

      {showActions ? (
        <div className="speaking-feedback__actions">
          <button
            type="button"
            className="speaking-flow-btn speaking-flow-btn--outline"
            onClick={onRetrySpeak}
            disabled={actionsDisabled}
          >
            Nói lại câu tốt hơn
          </button>
          <button
            type="button"
            className="speaking-flow-btn speaking-flow-btn--blue"
            onClick={onContinue}
            disabled={actionsDisabled}
          >
            Tiếp tục
          </button>
        </div>
      ) : null}
    </div>
  );
}
