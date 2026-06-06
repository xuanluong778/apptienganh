"use client";

import { SPEAKING_SCENARIOS } from "@/lib/lessons/speaking-scenarios";

export default function SpeakingScenarioChips({ activeScenarioId, onPick, disabled = false }) {
  return (
    <section className="speaking-scenarios speaking-scenarios--scroll-hint" aria-label="Tình huống luyện nói">
      <p className="speaking-scenarios__label">Chọn tình huống</p>
      <div className="speaking-scenario-rail" role="list">
        {SPEAKING_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`speaking-scenario-chip${activeScenarioId === s.id ? " speaking-scenario-chip--active" : ""}`}
            onClick={() => onPick?.(s)}
            disabled={disabled}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
