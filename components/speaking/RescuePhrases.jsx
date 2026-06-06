"use client";

import { RESCUE_PHRASES } from "@/lib/lessons/speaking-session-modes";

export default function RescuePhrases({ onPick, disabled = false }) {
  return (
    <aside className="speaking-side-panel speaking-side-panel--rescue" aria-label="Cứu nguy khi bí câu">
      <h3 className="speaking-side-panel__title">Cứu nguy khi bí câu</h3>
      <ul className="speaking-side-panel__list">
        {RESCUE_PHRASES.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="speaking-side-panel__item"
              onClick={() => onPick?.(p)}
              disabled={disabled}
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
