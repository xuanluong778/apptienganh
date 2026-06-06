"use client";

import { useEffect, useState } from "react";
import { AI_TEACHERS, getTeacherById, getTeacherVoiceName } from "@/lib/lessons/ai-teachers";

export default function TeacherPickerModal({
  open = false,
  selectedTeacherId = "bunny",
  onClose,
  onConfirm,
  lockDuringCall = false,
}) {
  const [draftId, setDraftId] = useState(selectedTeacherId);
  const draft = getTeacherById(draftId);
  const draftName = getTeacherVoiceName(draft);

  useEffect(() => {
    if (open) setDraftId(selectedTeacherId);
  }, [open, selectedTeacherId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleConfirm() {
    if (lockDuringCall) {
      onClose?.();
      return;
    }
    onConfirm?.(draftId);
    onClose?.();
  }

  return (
    <div className="voice-teacher-overlay" role="presentation" onClick={onClose}>
      <div
        className="voice-teacher-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn giáo viên"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="voice-teacher-modal__hero">
          <div className="voice-teacher-modal__heroPhoto">
            <img src={draft.portraitUrl} alt="" loading="lazy" decoding="async" />
          </div>
          <div className="voice-teacher-modal__heroBody">
            <div className="voice-teacher-modal__heroTitle">
              <h2>{draftName}</h2>
              <button
                type="button"
                className="voice-teacher-modal__speaker"
                aria-label={`Nghe giới thiệu ${draftName}`}
                onClick={() => {
                  const text = `${draftName}. ${draft.bio}`;
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(text);
                    u.lang = "vi-VN";
                    u.rate = 0.95;
                    window.speechSynthesis.speak(u);
                  }
                }}
              >
                🔊
              </button>
            </div>
            <p className="voice-teacher-modal__bio">{draft.bio}</p>
          </div>
          <button type="button" className="voice-teacher-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        {lockDuringCall ? (
          <p className="voice-teacher-modal__lockNote" role="status">
            Đang trong cuộc gọi — bạn có thể xem giáo viên, đổi sau khi kết thúc cuộc gọi.
          </p>
        ) : null}

        <div className="voice-teacher-modal__grid" role="listbox" aria-label="Danh sách giáo viên">
          {AI_TEACHERS.map((teacher) => {
            const active = draftId === teacher.id;
            const name = getTeacherVoiceName(teacher);
            return (
              <button
                key={teacher.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`voice-teacher-card${active ? " voice-teacher-card--active" : ""}`}
                onClick={() => setDraftId(teacher.id)}
              >
                <div className="voice-teacher-card__photo">
                  <img src={teacher.portraitUrl} alt="" loading="lazy" decoding="async" />
                  {teacher.online ? <span className="voice-teacher-card__online" aria-label="Online" /> : null}
                </div>
                <div className="voice-teacher-card__body">
                  <strong className="voice-teacher-card__name">{name}</strong>
                  <span className="voice-teacher-card__origin">{teacher.origin}</span>
                  <ul className="voice-teacher-card__traits">
                    {teacher.traits.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <div className="voice-teacher-card__tags">
                    {teacher.specialties.map((s) => (
                      <span key={s.label} className="voice-teacher-card__tag">
                        <span aria-hidden>{s.icon}</span> {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="voice-teacher-modal__footer">
          <button type="button" className="voice-teacher-modal__cancel" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="voice-teacher-modal__confirm" onClick={handleConfirm}>
            {lockDuringCall ? "Đóng" : `Tiếp tục với ${draftName}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
