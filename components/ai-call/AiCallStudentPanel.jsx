"use client";

import { CorrectionModal, CorrectionSummaryCard } from "./CorrectionPanel";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function AiCallTranscript({
  messages = [],
  listRef,
  evaluation,
  scores,
  sentenceMeaning = "",
  correctionHighlighted,
  onViewCorrection,
  onListenCorrect,
  onSpeakAgain,
}) {
  return (
    <div className="ai-call-transcript" ref={listRef} aria-live="polite">
      {messages.length === 0 ? (
        <p className="ai-call-transcript__empty">Bấm micro và nói tiếng Anh để bắt đầu hội thoại.</p>
      ) : null}
      {messages.map((m) => {
        if (m.role === "assistant") {
          return (
            <div key={m.id} className="ai-call-msg ai-call-msg--ai">
              <span className="ai-call-msg__avatar" aria-hidden>
                🤖
              </span>
              <div className="ai-call-msg__bubble">
                <p>{m.text}</p>
                {m.time ? <time>{formatTime(m.time)}</time> : null}
              </div>
            </div>
          );
        }
        return (
          <div key={m.id} className="ai-call-msg ai-call-msg--user">
            <div className="ai-call-msg__bubble">
              <p>{m.text}</p>
              {m.time ? <time>{formatTime(m.time)}</time> : null}
            </div>
            <span className="ai-call-msg__avatar ai-call-msg__avatar--user" aria-hidden>
              👤
            </span>
          </div>
        );
      })}

      <CorrectionSummaryCard
        evaluation={evaluation}
        scores={scores}
        sentenceMeaning={sentenceMeaning}
        highlighted={correctionHighlighted}
        onViewDetails={onViewCorrection}
        onListenCorrect={onListenCorrect}
        onSpeakAgain={onSpeakAgain}
      />
    </div>
  );
}

export function AiCallStudentHeader({ statusHint = "" }) {
  return (
    <header className="ai-call-student__header">
      <div className="ai-call-student__headerMain">
        <h2 className="ai-call-student__title">Hội thoại</h2>
        <p className="ai-call-student__subtitle">Nói tiếng Anh — AI sẽ phản hồi và sửa lỗi</p>
      </div>
      {statusHint ? <p className="ai-call-student__status">{statusHint}</p> : null}
    </header>
  );
}

export default function AiCallStudentPanel({
  messages,
  listRef,
  evaluation,
  scores,
  statusHint = "",
  correctionHighlighted = false,
  correctionModalOpen = false,
  sentenceMeaning = "",
  onViewCorrection,
  onCloseCorrection,
  onListenCorrect,
  onSpeakAgain,
  onAddReview,
  onReplayTeacher,
  reviewAdded,
}) {
  return (
    <section className="ai-call-student" aria-label="Học viên">
      <AiCallStudentHeader statusHint={statusHint} />

      <div className="ai-call-student__body">
        <AiCallTranscript
          messages={messages}
          listRef={listRef}
          evaluation={evaluation}
          scores={scores}
          sentenceMeaning={sentenceMeaning}
          correctionHighlighted={correctionHighlighted}
          onViewCorrection={onViewCorrection}
          onListenCorrect={onListenCorrect}
          onSpeakAgain={onSpeakAgain}
        />
      </div>

      <CorrectionModal
        open={correctionModalOpen}
        onClose={onCloseCorrection}
        evaluation={evaluation}
        scores={scores}
        sentenceMeaning={sentenceMeaning}
        highlighted={correctionHighlighted}
        onListenCorrect={onListenCorrect}
        onSpeakAgain={onSpeakAgain}
        onAddReview={onAddReview}
        onReplayTeacher={onReplayTeacher}
        reviewAdded={reviewAdded}
      />
    </section>
  );
}
