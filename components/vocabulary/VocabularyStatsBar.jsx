"use client";

import { useEffect, useState } from "react";

const STAT_ITEMS = [
  { key: "learned_today", label: "Đã học hôm nay", suffix: "từ", icon: "📘" },
  { key: "review_due", label: "Cần ôn", suffix: "từ", icon: "🔄" },
  { key: "streak_days", label: "Chuỗi ngày", suffix: "ngày", icon: "🔥" },
];

export default function VocabularyStatsBar() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/vocabulary/stats", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setStats(json.data || null);
        }
      } catch {
        if (!cancelled) setStats(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="beego-vocab-statsRow" aria-label="Thống kê từ vựng">
      {STAT_ITEMS.map((item) => (
        <div key={item.key} className="beego-vocab-statCard">
          <span className="beego-vocab-statCardIcon" aria-hidden>
            {item.icon}
          </span>
          <div className="beego-vocab-statCardText">
            <span className="beego-vocab-statCardLabel">{item.label}</span>
            <span className="beego-vocab-statCardValue">
              {loading ? "…" : stats?.[item.key] ?? 0} {item.suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
