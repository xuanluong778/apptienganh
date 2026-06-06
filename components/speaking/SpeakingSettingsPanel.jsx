"use client";

import { AI_TEACHERS } from "@/lib/lessons/ai-teachers";
import { PRACTICE_MODES } from "@/lib/lessons/practice-mode";
import { LANGUAGE_SUPPORT_MODES } from "@/lib/lessons/language-support-mode";

export default function SpeakingSettingsPanel({
  selectedTeacher,
  onSelectTeacher,
  practiceMode,
  onPracticeMode,
  languageSupportMode,
  onLanguageMode,
  disabled = false,
  className = "",
}) {
  return (
    <details className={`speaking-panel speaking-panel--settings speaking-panel--fold ${className}`.trim()} open>
      <summary className="speaking-panel__fold-trigger">
        <span>⚙️ Giáo viên & cài đặt</span>
        <span className="speaking-panel__chevron" aria-hidden />
      </summary>
      <div className="speaking-panel__inner">
      <h2 className="speaking-panel__title speaking-panel__title--desktop">Giáo viên AI</h2>
      <div className="speaking-teachers" role="listbox" aria-label="Chọn giáo viên">
        {AI_TEACHERS.map((teacher) => {
          const active = selectedTeacher === teacher.id;
          return (
            <button
              key={teacher.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`speaking-teacher${active ? " speaking-teacher--active" : ""}`}
              onClick={() => onSelectTeacher(teacher.id)}
              disabled={disabled}
            >
              <span className="speaking-teacher__emoji" aria-hidden>
                {teacher.emoji}
              </span>
              <span>
                <span className="speaking-teacher__name">{teacher.name}</span>
                <span className="speaking-teacher__tag">{teacher.tag}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="speaking-mode-group">
        <span className="speaking-mode-label">Chế độ luyện</span>
        <div className="speaking-mode-chips" role="group" aria-label="Chế độ luyện">
          {PRACTICE_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`speaking-mode-chip${practiceMode === mode.id ? " speaking-mode-chip--active" : ""}`}
              aria-pressed={practiceMode === mode.id}
              title={mode.hint}
              onClick={() => onPracticeMode(mode.id)}
              disabled={disabled}
            >
              {mode.shortLabel || mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="speaking-mode-group">
        <span className="speaking-mode-label">Ngôn ngữ hỗ trợ</span>
        <div className="speaking-mode-chips" role="group" aria-label="Ngôn ngữ hỗ trợ">
          {LANGUAGE_SUPPORT_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`speaking-mode-chip${languageSupportMode === mode.id ? " speaking-mode-chip--active" : ""}`}
              aria-pressed={languageSupportMode === mode.id}
              title={mode.hint}
              onClick={() => onLanguageMode(mode.id)}
              disabled={disabled}
            >
              {mode.shortLabel || mode.label}
            </button>
          ))}
        </div>
      </div>

      <p className="speaking-settings-note">
        Muốn gọi thoại real-time? Chọn chế độ <strong>Gọi thoại AI</strong> trong phòng đàm thoại.
      </p>
      </div>
    </details>
  );
}
