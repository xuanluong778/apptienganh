"use client";

import { AI_TEACHERS } from "@/lib/lessons/ai-teachers";
import { PRACTICE_MODES } from "@/lib/lessons/practice-mode";
import { LANGUAGE_SUPPORT_MODES } from "@/lib/lessons/language-support-mode";

export default function SpeakingCompactSettings({
  selectedTeacher,
  onSelectTeacher,
  practiceMode,
  onPracticeMode,
  languageSupportMode,
  onLanguageMode,
  disabled = false,
}) {
  return (
    <details className="speaking-compact-settings">
      <summary>⚙️ Giáo viên & cài đặt</summary>
      <div className="speaking-compact-settings__body">
        <div className="speaking-teachers speaking-teachers--compact" role="listbox" aria-label="Giáo viên">
          {AI_TEACHERS.map((teacher) => (
            <button
              key={teacher.id}
              type="button"
              role="option"
              aria-selected={selectedTeacher === teacher.id}
              className={`speaking-teacher speaking-teacher--compact${selectedTeacher === teacher.id ? " speaking-teacher--active" : ""}`}
              onClick={() => onSelectTeacher(teacher.id)}
              disabled={disabled}
            >
              <span aria-hidden>{teacher.emoji}</span>
              <span className="speaking-teacher__name">{teacher.name}</span>
            </button>
          ))}
        </div>
        <div className="speaking-mode-chips">
          {PRACTICE_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`speaking-mode-chip${practiceMode === mode.id ? " speaking-mode-chip--active" : ""}`}
              onClick={() => onPracticeMode(mode.id)}
              disabled={disabled}
            >
              {mode.shortLabel || mode.label}
            </button>
          ))}
        </div>
        <div className="speaking-mode-chips">
          {LANGUAGE_SUPPORT_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`speaking-mode-chip${languageSupportMode === mode.id ? " speaking-mode-chip--active" : ""}`}
              onClick={() => onLanguageMode(mode.id)}
              disabled={disabled}
            >
              {mode.shortLabel || mode.label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
