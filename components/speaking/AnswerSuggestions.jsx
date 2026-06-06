"use client";

export default function AnswerSuggestions({ suggestions = [], onPick, disabled = false }) {
  if (!suggestions.length) return null;

  return (
    <aside className="speaking-side-panel speaking-side-panel--hints" aria-label="Gợi ý trả lời">
      <h3 className="speaking-side-panel__title">Gợi ý trả lời</h3>
      <ul className="speaking-side-panel__list">
        {suggestions.map((text) => (
          <li key={text}>
            <button
              type="button"
              className="speaking-side-panel__item"
              onClick={() => onPick?.(text)}
              disabled={disabled}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
