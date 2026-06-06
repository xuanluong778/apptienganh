"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VocabularyProgressPanel({ stats = null, loading = false }) {
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReviewLoading(true);
      try {
        const res = await fetch("/api/review/today?limit=5", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setReviewItems(json.data || []);
        } else if (!cancelled) {
          setReviewItems([]);
        }
      } catch {
        if (!cancelled) setReviewItems([]);
      }
      if (!cancelled) setReviewLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stats?.review_due]);

  const s = stats || {};

  return (
    <div className="beego-vocab-sidePanel">
      <div className="beego-vocab-sideBlock">
        <h3 className="beego-vocab-sideBlock__title">Ôn tập hôm nay</h3>
        {reviewLoading ? (
          <p className="beego-vocab-sideBlock__hint">Đang tải…</p>
        ) : reviewItems.length === 0 ? (
          <p className="beego-vocab-sideBlock__hint">
            {s.authenticated === false
              ? "Đăng nhập để xem từ cần ôn."
              : "Chưa có từ cần ôn — thêm từ vào ôn tập nhé!"}
          </p>
        ) : (
          <ul className="beego-vocab-reviewList">
            {reviewItems.map((item) => (
              <li key={item.id} className="beego-vocab-reviewItem">
                <strong>{item.word}</strong>
                <span>{item.vietnamese_meaning || ""}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/quiz" className="beego-vocab-sideLink">
          Làm quiz ôn tập →
        </Link>
      </div>

      <div className="beego-vocab-sideBlock beego-vocab-sideBlock--soft">
        <h3 className="beego-vocab-sideBlock__title">Tiến độ của bạn</h3>
        <ul className="beego-vocab-sideStats">
          <li>
            <span>Đã học hôm nay</span>
            <strong>{loading ? "…" : s.learned_today ?? 0}</strong>
          </li>
          <li>
            <span>Đang theo dõi</span>
            <strong>{loading ? "…" : s.total_learning ?? 0}</strong>
          </li>
          <li>
            <span>Chuỗi ngày</span>
            <strong>{loading ? "…" : `🔥 ${s.streak_days ?? 0}`}</strong>
          </li>
        </ul>
        <Link href="/progress" className="beego-vocab-sideLink">
          Xem chi tiết tiến độ →
        </Link>
      </div>
    </div>
  );
}
