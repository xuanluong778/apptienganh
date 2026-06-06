"use client";

import { SPEAKING_SCENARIOS } from "@/lib/lessons/speaking-scenarios";

const SCENARIOS = SPEAKING_SCENARIOS.map((s) => ({ label: s.label, prompt: s.prompt }));

export default function SpeakingPromptChips({ onPick }) {
  return (
    <section aria-label="Tình huống gợi ý sẵn">
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--beego-ink-soft)", fontSize: "0.92rem" }}>
        Luyện nói theo tình huống — chọn một nút, không cần gõ:
      </p>
      <div className="beego-prompt-chips">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="beego-prompt-chip"
            onClick={() => onPick?.(s.prompt, s.label)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
