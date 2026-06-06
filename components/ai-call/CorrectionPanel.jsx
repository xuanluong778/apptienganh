"use client";

import { useEffect } from "react";

function ShortScores({ scores }) {
  if (!scores) return null;
  const items = [
    { key: "pronunciation", label: "PA", value: scores.pronunciation },
    { key: "grammar", label: "NP", value: scores.grammar },
    { key: "naturalness", label: "TN", value: scores.naturalness },
  ];
  return (
    <div className="ai-call-correction-summary__scores" aria-label="Điểm nhanh">
      {items.map((item, i) => (
        <span key={item.key}>
          {i > 0 ? <span className="ai-call-correction-summary__dot">·</span> : null}
          <span className="ai-call-correction-summary__score">
            {item.label} {item.value ?? "—"}
          </span>
        </span>
      ))}
    </div>
  );
}

function CorrectionDetails({
  evaluation,
  scores,
  sentenceMeaning = "",
  showMetrics = true,
  onListenCorrect,
  onSpeakAgain,
  onAddReview,
  onReplayTeacher,
  reviewAdded = false,
}) {
  if (!evaluation || evaluation.is_correct) return null;

  const why = Array.isArray(evaluation.why_wrong) ? evaluation.why_wrong : [];

  return (
    <>
      <div className="ai-call-correction__row">
        <span className="ai-call-correction__label ai-call-correction__label--bad">Bạn đã nói</span>
        <p className="ai-call-correction__said">{evaluation.you_said || "—"}</p>
      </div>

      <div className="ai-call-correction__row">
        <span className="ai-call-correction__label ai-call-correction__label--good">Câu đúng nên là</span>
        <p className="ai-call-correction__correct">{evaluation.correct_sentence || "—"}</p>
      </div>

      {why.length ? (
        <div className="ai-call-correction__row">
          <span className="ai-call-correction__label">Giải thích (tiếng Việt)</span>
          <ul className="ai-call-correction__why">
            {why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {sentenceMeaning ? (
        <div className="ai-call-correction__row">
          <span className="ai-call-correction__label">📖 Nghĩa câu (tiếng Việt)</span>
          <p className="ai-call-correction__meaning">{sentenceMeaning}</p>
        </div>
      ) : null}

      <div className="ai-call-correction__row">
        <span className="ai-call-correction__label ai-call-correction__label--good">Hãy nói lại</span>
        <p className="ai-call-correction__repeat">{evaluation.say_again || evaluation.correct_sentence}</p>
      </div>

      {showMetrics && scores ? (
        <div className="ai-call-correction__metrics">
          <div className="ai-call-metrics">
            {[
              { key: "pronunciation", label: "Phát âm", value: scores.pronunciation },
              { key: "grammar", label: "Ngữ pháp", value: scores.grammar },
              { key: "naturalness", label: "Tự nhiên", value: scores.naturalness },
            ].map((item) => (
              <div key={item.key} className="ai-call-metrics__card">
                <span className="ai-call-metrics__value">{item.value ?? "—"}</span>
                <span className="ai-call-metrics__label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ai-call-correction__actions">
        <button type="button" className="ai-call-correction__btn" onClick={onReplayTeacher}>
          🔊 Nghe giáo viên giải thích
        </button>
        <button type="button" className="ai-call-correction__btn" onClick={onListenCorrect}>
          🔊 Nghe & đọc đúng
        </button>
        <button type="button" className="ai-call-correction__btn ai-call-correction__btn--primary" onClick={onSpeakAgain}>
          🎤 Nói lại
        </button>
        <button
          type="button"
          className="ai-call-correction__btn ai-call-correction__btn--review"
          onClick={onAddReview}
          disabled={reviewAdded}
        >
          {reviewAdded ? "✓ Đã thêm ôn tập" : "+ Thêm lỗi vào ôn tập"}
        </button>
      </div>
    </>
  );
}

/** Thẻ tóm tắt nhỏ trong luồng chat — không chiếm hết viewport */
export function CorrectionSummaryCard({
  evaluation,
  scores,
  sentenceMeaning = "",
  highlighted = false,
  onViewDetails,
  onListenCorrect,
  onSpeakAgain,
}) {
  if (!evaluation || evaluation.is_correct) return null;

  const why = Array.isArray(evaluation.why_wrong) ? evaluation.why_wrong.filter(Boolean) : [];
  const meaning = String(sentenceMeaning || "").trim();

  return (
    <div
      id="ai-call-correction-summary"
      className={`ai-call-correction-summary${highlighted ? " ai-call-correction-summary--highlight" : ""}`}
      role="region"
      aria-label="Tóm tắt sửa lỗi"
    >
      <div className="ai-call-correction-summary__head">
        <span className="ai-call-correction-summary__badge">Cần sửa</span>
        <ShortScores scores={scores} />
      </div>

      <div className="ai-call-correction-summary__lines">
        {why[0] ? (
          <p className="ai-call-correction-summary__explain">
            <strong>Giải thích:</strong> {why[0]}
          </p>
        ) : null}
        {meaning ? (
          <p className="ai-call-correction-summary__meaning">
            <strong>📖 Nghĩa câu:</strong> {meaning}
          </p>
        ) : null}
        <p>
          <strong>Bạn đã nói:</strong>{" "}
          <span className="ai-call-correction-summary__bad">{evaluation.you_said || "—"}</span>
        </p>
        <p>
          <strong>Câu đúng:</strong>{" "}
          <span className="ai-call-correction-summary__good">{evaluation.correct_sentence || "—"}</span>
        </p>
      </div>

      <div className="ai-call-correction-summary__actions">
        <button type="button" className="ai-call-correction-summary__btn ai-call-correction-summary__btn--primary" onClick={onViewDetails}>
          Xem sửa lỗi
        </button>
        <button type="button" className="ai-call-correction-summary__btn" onClick={onListenCorrect}>
          🔊 Nghe & đọc đúng
        </button>
        <button type="button" className="ai-call-correction-summary__btn" onClick={onSpeakAgain}>
          🎤 Nói lại
        </button>
      </div>
    </div>
  );
}

/** Popup desktop / bottom sheet mobile */
export function CorrectionModal({
  open = false,
  onClose,
  evaluation,
  scores,
  sentenceMeaning = "",
  highlighted = false,
  onListenCorrect,
  onSpeakAgain,
  onAddReview,
  onReplayTeacher,
  reviewAdded = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !evaluation || evaluation.is_correct) return null;

  return (
    <div className="ai-call-correction-modal" role="presentation">
      <button type="button" className="ai-call-correction-modal__backdrop" aria-label="Đóng" onClick={onClose} />
      <div
        id="ai-call-correction-panel"
        className={`ai-call-correction-modal__sheet ai-call-correction ai-call-correction--modal${highlighted ? " ai-call-correction--highlight" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-call-correction-modal-title"
      >
        <div className="ai-call-correction-modal__handle" aria-hidden />
        <button type="button" className="ai-call-correction-modal__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h4 id="ai-call-correction-modal-title" className="ai-call-correction__title">
          Sửa lỗi bằng tiếng Việt
        </h4>
        <div className="ai-call-correction-modal__body">
          <CorrectionDetails
            evaluation={evaluation}
            scores={scores}
            sentenceMeaning={sentenceMeaning}
            showMetrics
            onListenCorrect={onListenCorrect}
            onSpeakAgain={onSpeakAgain}
            onAddReview={onAddReview}
            onReplayTeacher={onReplayTeacher}
            reviewAdded={reviewAdded}
          />
        </div>
      </div>
    </div>
  );
}

/** @deprecated inline panel — dùng CorrectionSummaryCard + CorrectionModal */
export default function CorrectionPanel(props) {
  const fallbackOpen = Boolean(props.evaluation && !props.evaluation.is_correct);
  return <CorrectionModal {...props} open={props.open ?? fallbackOpen} />;
}
