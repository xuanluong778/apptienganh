"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BeegoDashboardPersonal from "@/components/beego/BeegoDashboardPersonal";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);

  const load = async (cancelledRef) => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const m = String(json?.message || "").trim() || "Không tải được dashboard.";
        if (!cancelledRef.cancelled) setErr(m);
        return;
      }
      if (!cancelledRef.cancelled) setData(json.data || null);
    } catch {
      if (!cancelledRef.cancelled) setErr("Lỗi kết nối. Vui lòng tải lại trang.");
    } finally {
      if (!cancelledRef.cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelledRef = { cancelled: false };
    void load(cancelledRef);

    const onStorage = (e) => {
      if (e?.key !== "dash_refresh_v1") return;
      void load(cancelledRef);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelledRef.cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/analytics", { cache: "no-store", credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json?.success) {
          setAnalytics(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        // ignore silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/insights", { cache: "no-store", credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json?.success) {
          setInsights(json.data || null);
        }
      } catch {
        // ignore silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewCount = Number(data?.review_count || 0);
  const newCount = Number(data?.new_words_count || 0);
  const dailyProgress = Number(data?.daily_progress || 0);
  const xpToday = Number(data?.xp_today || 0);
  const xpTotal = Number(data?.xp_total || 0);
  const streak = Number(data?.streak || 0);
  const ctaHref = reviewCount > 0 ? "/quiz?mode=review" : "/quiz";
  const ctaLabel = reviewCount > 0 ? "Review now" : "Learn new";

  return (
    <main className="dash">
      <section className="card">
        <div className="topRow">
          <div>
            <h1>Beego Dashboard</h1>
            <p className="sub">Lộ trình cá nhân & kế hoạch hôm nay</p>
          </div>
          <div className="stats">
            <div className="pill" aria-label="Tổng XP">
              <span className="k">XP</span>
              <span className="v">{xpTotal}</span>
            </div>
            <div className="pill pillToday" aria-label="XP hôm nay">
              <span className="k">+XP</span>
              <span className="v">{xpToday}</span>
            </div>
            <div className="pill pillStreak" aria-label="Chuỗi đúng">
              <span className="k">🔥</span>
              <span className="v">{streak}</span>
            </div>
          </div>
        </div>

        {loading ? <p className="msg">Đang tải...</p> : null}
        {!loading && err ? <p className="err">{err}</p> : null}

        {!loading && !err ? (
          <>
            <BeegoDashboardPersonal />

            <div className="plan">
              <div className="planRow">
                <div className="planTitle">Today plan</div>
                <div className="planPct">{dailyProgress}%</div>
              </div>
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dailyProgress}>
                <div className="barFill" style={{ width: `${Math.max(0, Math.min(100, dailyProgress))}%` }} />
              </div>
              <div className="planHint">
                Ôn: <strong>{reviewCount}</strong> • Từ mới còn lại: <strong>{newCount}</strong>
              </div>
              <Link className="cta ctaWide" href={ctaHref}>
                {ctaLabel}
              </Link>
            </div>

            <div className="grid">
            <div className="box">
              <h2>Review today</h2>
              <p className="count">
                <strong>{reviewCount}</strong> từ đến hạn ôn
              </p>
              <Link className={`cta ${reviewCount ? "" : "ctaDisabled"}`} href="/quiz?mode=review" aria-disabled={!reviewCount}>
                Bắt đầu ôn tập
              </Link>
              {!reviewCount ? <p className="hint">Hôm nay chưa có từ cần ôn. Bạn có thể học từ mới.</p> : null}
            </div>

            <div className="box">
              <h2>Learn new</h2>
              <p className="count">
                <strong>{newCount}</strong> từ chưa học
              </p>
              <Link className="cta ctaAlt" href="/quiz">
                Learn new
              </Link>
              <p className="hint">Quiz sẽ tự lấy từ mới nếu hôm nay chưa có từ cần ôn.</p>
            </div>
            </div>

            {Array.isArray(analytics) && analytics.length ? (
              <div className="chartBox" aria-label="Thống kê 7 ngày gần nhất">
                <h2>7-day stats</h2>
                <p className="hint">Answers/day + % correct</p>
                <MiniChart data={analytics} />
              </div>
            ) : null}

            {insights?.suggestion ? (
              <div className="insightsBox" aria-label="Insights">
                <h2>Insights</h2>
                <p className="insightText">{insights.suggestion}</p>
                {Array.isArray(insights.weak_words) && insights.weak_words.length ? (
                  <div className="insightList">
                    <div className="insightLabel">Weak words</div>
                    <div className="chips">
                      {insights.weak_words.slice(0, 4).map((w) => (
                        <span key={w.word_id || w.word} className="chip">
                          {w.word} • {w.correct_rate}%
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {Array.isArray(insights.low_accuracy_topics) && insights.low_accuracy_topics.length ? (
                  <div className="insightList">
                    <div className="insightLabel">Low accuracy topics</div>
                    <div className="chips">
                      {insights.low_accuracy_topics.slice(0, 3).map((t) => (
                        <span key={t.topic} className="chip chipTopic">
                          {t.topic} • {t.correct_rate}%
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <style jsx>{`
        .dash {
          min-height: 100vh;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        }
        .card {
          width: min(1100px, 96vw);
          margin: 0 auto;
          background: #fff;
          border-radius: 22px;
          border: 4px solid #fff;
          padding: 1rem;
        }
        .topRow {
          display: flex;
          gap: 0.8rem;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        h1 {
          margin: 0;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          letter-spacing: 0.01em;
          color: #2f4f88;
        }
        .sub {
          margin: 0.15rem 0 0;
          color: #4d67a0;
          font-weight: 600;
        }
        .stats {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          border: 2px solid #0b2115;
          background: #fff;
          color: #0b2115;
          font-weight: 900;
          font-size: 0.9rem;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
        }
        .pillStreak {
          background: #fff7ed;
          border-color: #fdba74;
        }
        .pillToday {
          background: #eef2ff;
          border-color: #a5b4fc;
        }
        .plan {
          margin-top: 0.9rem;
          border: 2px dashed #c9d8ff;
          border-radius: 18px;
          padding: 0.85rem;
          background: #ffffff;
        }
        .planRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.6rem;
        }
        .planTitle {
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          font-weight: 900;
          letter-spacing: 0.01em;
          color: #2f4f88;
          font-size: 1.1rem;
        }
        .planPct {
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          font-weight: 900;
          color: #2f4f88;
        }
        .bar {
          margin-top: 0.55rem;
          height: 12px;
          border-radius: 999px;
          background: #e7eeff;
          overflow: hidden;
        }
        .barFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #65d3ff, #8b7cff);
          transition: width 0.35s ease;
        }
        .planHint {
          margin-top: 0.55rem;
          color: #4d67a0;
          font-weight: 700;
        }
        .ctaWide {
          margin-top: 0.65rem;
          width: 100%;
        }
        .chartBox {
          margin-top: 0.9rem;
          border: 2px dashed #c9d8ff;
          border-radius: 18px;
          padding: 0.85rem;
          background: #ffffff;
        }
        .chartBox h2 {
          margin: 0;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          letter-spacing: 0.01em;
          color: #2f4f88;
          font-size: 1.2rem;
        }
        .insightsBox {
          margin-top: 0.9rem;
          border: 2px dashed #c9d8ff;
          border-radius: 18px;
          padding: 0.85rem;
          background: #ffffff;
        }
        .insightsBox h2 {
          margin: 0;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          letter-spacing: 0.01em;
          color: #2f4f88;
          font-size: 1.2rem;
        }
        .insightText {
          margin: 0.45rem 0 0.6rem;
          color: #2f4f88;
          font-weight: 700;
        }
        .insightList {
          margin-top: 0.55rem;
          display: grid;
          gap: 0.35rem;
        }
        .insightLabel {
          color: #4d67a0;
          font-weight: 900;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          letter-spacing: 0.01em;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.28rem 0.55rem;
          background: #f7fbff;
          border: 1px solid #c9d8ff;
          color: #2f4f88;
          font-weight: 800;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .chipTopic {
          background: #fff7ed;
          border-color: #fdba74;
        }
        .grid {
          margin-top: 0.9rem;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
        }
        .box {
          border: 2px dashed #c9d8ff;
          border-radius: 18px;
          padding: 0.85rem;
          background: #f7fbff;
        }
        .box h2 {
          margin: 0;
          font-family: var(--font-heading), "Oswald", Roboto, sans-serif;
          letter-spacing: 0.01em;
          color: #2f4f88;
          font-size: 1.2rem;
        }
        .count {
          margin: 0.35rem 0 0.65rem;
          color: #2f4f88;
          font-weight: 700;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border: 3px solid #fff;
          border-radius: 999px;
          padding: 10px 16px;
          background: linear-gradient(180deg, #63cf8a, #2fb363);
          color: #fff;
          font-weight: 900;
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.14);
        }
        .ctaAlt {
          background: linear-gradient(180deg, #72d9ff, #4f8cff);
        }
        .ctaDisabled {
          opacity: 0.55;
          pointer-events: none;
          box-shadow: none;
        }
        .hint {
          margin: 0.55rem 0 0;
          color: #4d67a0;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .msg {
          margin: 0.75rem 0 0;
          text-align: center;
          font-weight: 700;
        }
        .err {
          margin: 0.75rem 0 0;
          text-align: center;
          color: #b42318;
          font-weight: 800;
          background: #fff1f2;
          border: 2px dashed #fda4af;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
        }
        @media (max-width: 820px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function MiniChart({ data }) {
  const max = Math.max(1, ...data.map((d) => Number(d.total_answers || 0)));
  const w = 280;
  const h = 90;
  const pad = 10;
  const dx = (w - pad * 2) / Math.max(1, data.length - 1);

  const pts = data
    .map((d, i) => {
      const v = Number(d.total_answers || 0);
      const x = pad + i * dx;
      const y = pad + (1 - v / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const avgCorrect = Math.round(
    data.reduce((sum, d) => sum + Number(d.correct_rate || 0), 0) / Math.max(1, data.length)
  );

  return (
    <div className="miniChart">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Answers per day">
        <path d={`M ${pad} ${h - pad} H ${w - pad}`} stroke="#c9d8ff" strokeWidth="2" fill="none" />
        <polyline
          points={pts}
          fill="none"
          stroke="#4f8cff"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="miniLegend">
        <span>
          Avg correct: <strong>{avgCorrect}%</strong>
        </span>
      </div>
      <style jsx>{`
        .miniChart {
          margin-top: 0.55rem;
          display: grid;
          gap: 0.25rem;
          justify-items: start;
        }
        .miniLegend {
          color: #4d67a0;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

