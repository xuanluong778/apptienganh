"use client";

export default function SpeakingRoadmapCard({ level = 2, title = "Phản xạ hằng ngày", progress = 60 }) {
  return (
    <div className="speaking-roadmap">
      <div className="speaking-roadmap__head">
        <span className="speaking-roadmap__bee" aria-hidden>
          🐝
        </span>
        <div>
          <p className="speaking-roadmap__level">Level {level}</p>
          <p className="speaking-roadmap__title">{title}</p>
        </div>
      </div>
      <div className="speaking-roadmap__bar">
        <div className="speaking-roadmap__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="speaking-roadmap__pct">{progress}% hoàn thành</p>
    </div>
  );
}
