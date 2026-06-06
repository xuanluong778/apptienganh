"use client";

import storyStyles from "./KidsStories.module.css";

export default function HoverTranslateToggle({ enabled, onChange }) {
  return (
    <div className={storyStyles.hoverTranslateWrap}>
      <span className={storyStyles.hoverTranslateLabel}>Dịch khi rê</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? "Tắt dịch khi rê chuột" : "Bật dịch khi rê chuột"}
        className={`${storyStyles.hoverTranslateSwitch} ${enabled ? storyStyles.hoverTranslateSwitchOn : ""}`}
        onClick={() => onChange(!enabled)}
      >
        <span className={storyStyles.hoverTranslateTrack} aria-hidden>
          <span className={storyStyles.hoverTranslateThumb} />
        </span>
      </button>
      <span className={storyStyles.hoverTranslateState} aria-hidden>
        {enabled ? "Bật" : "Tắt"}
      </span>
    </div>
  );
}
