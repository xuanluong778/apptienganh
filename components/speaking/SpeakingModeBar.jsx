"use client";

import { SESSION_MODES, formatQuickTimer } from "@/lib/lessons/speaking-session-modes";

export default function SpeakingModeBar({
  sessionMode,
  onModeChange,
  quickSecsLeft = null,
  disabled = false,
}) {
  return (
    <div className="speaking-mode-cards" role="tablist" aria-label="Chế độ luyện nói">
      {SESSION_MODES.map((mode) => {
        const active = sessionMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`speaking-mode-card${active ? " speaking-mode-card--active" : ""}`}
            title={mode.hint}
            onClick={() => onModeChange?.(mode.id)}
            disabled={disabled}
          >
            <span className="speaking-mode-card__emoji" aria-hidden>
              {mode.emoji}
            </span>
            <span className="speaking-mode-card__label">{mode.label}</span>
            {mode.id === "voice_call" ? (
              <span className="speaking-mode-card__pro">Pro</span>
            ) : null}
            {mode.id === "quick_5" && quickSecsLeft != null ? (
              <span className="speaking-mode-card__timer">{formatQuickTimer(quickSecsLeft)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
