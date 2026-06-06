"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProgressRing from "@/components/beego/ui/ProgressRing";
import LearningCard from "@/components/beego/ui/LearningCard";
import EmptyState from "@/components/beego/ui/EmptyState";
import BigCTAButton from "@/components/beego/ui/BigCTAButton";

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [dashRes, anaRes] = await Promise.all([
          fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/dashboard/analytics", { cache: "no-store", credentials: "same-origin" }),
        ]);
        const dashJson = await dashRes.json().catch(() => null);
        const anaJson = await anaRes.json().catch(() => null);
        if (!cancelled) {
          if (!dashRes.ok || !dashJson?.success) {
            setErr(dashJson?.message || "Đăng nhập để xem tiến độ.");
            setData(null);
          } else {
            setData(dashJson.data);
          }
          if (anaRes.ok && anaJson?.success) {
            setAnalytics(Array.isArray(anaJson.data) ? anaJson.data : []);
          }
        }
      } catch {
        if (!cancelled) setErr("Không tải được tiến độ. Thử lại sau.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="beego-page">
        <p style={{ fontWeight: 700, color: "var(--beego-ink-soft)" }}>Đang tải tiến độ…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="beego-page">
        <EmptyState
          icon="📊"
          title="Tiến độ học"
          description={err || "Chưa có dữ liệu."}
          action={
            <BigCTAButton href="/auth" variant="primary">
              Đăng nhập
            </BigCTAButton>
          }
        />
      </div>
    );
  }

  const dailyProgress = Number(data.daily_progress || 0);
  const streak = Number(data.streak || 0);
  const xpToday = Number(data.xp_today || 0);
  const xpTotal = Number(data.xp_total || 0);

  return (
    <div className="beego-page">
      <section className="beego-page-hero" style={{ textAlign: "left", padding: "8px 0 20px" }}>
        <h1 style={{ textAlign: "left" }}>Tiến độ</h1>
        <p style={{ textAlign: "left" }}>Theo dõi đơn giản theo ngày — không cần đọc biểu đồ phức tạp.</p>
      </section>

      <div className="beego-grid-2">
        <div style={{ padding: 20, borderRadius: 20, background: "var(--beego-surface)", border: "1px solid var(--beego-border)", display: "flex", alignItems: "center", gap: 16 }}>
          <ProgressRing value={dailyProgress} />
          <div>
            <strong style={{ display: "block", fontSize: "1.05rem" }}>Hôm nay</strong>
            <span style={{ color: "var(--beego-ink-soft)", fontWeight: 600 }}>{dailyProgress}% kế hoạch</span>
          </div>
        </div>
        <div style={{ padding: 20, borderRadius: 20, background: "var(--beego-surface)", border: "1px solid var(--beego-border)" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--beego-muted)", fontWeight: 700 }}>Chuỗi ngày</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>🔥 {streak}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--beego-muted)", fontWeight: 700 }}>XP hôm nay</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>+{xpToday}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", color: "var(--beego-muted)", fontWeight: 700 }}>Tổng XP</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{xpTotal}</div>
            </div>
          </div>
        </div>
      </div>

      {analytics.length ? (
        <div style={{ marginTop: 20, padding: 18, borderRadius: 20, background: "var(--beego-surface)", border: "1px solid var(--beego-border)" }}>
          <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-heading), Oswald, sans-serif", fontSize: "1.1rem" }}>
            7 ngày gần nhất
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {analytics.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 80px",
                  minWidth: 72,
                  padding: "10px 8px",
                  borderRadius: 12,
                  background: "var(--beego-bg)",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ color: "var(--beego-muted)" }}>{d.day_label || `Ngày ${i + 1}`}</div>
                <div style={{ fontSize: "1.1rem", color: "var(--beego-ink)" }}>{d.total_answers ?? 0}</div>
                <div style={{ color: "var(--beego-blue)" }}>{d.correct_rate ?? 0}% đúng</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="beego-section-title" style={{ marginTop: 24 }}>
        Tiếp tục học
      </h2>
      <div className="beego-grid-2">
        <LearningCard href="/quiz?mode=review" icon="🧠" title="Ôn tập thông minh" description={`${data.review_count ?? 0} từ đến hạn`} />
        <LearningCard href="/" icon="📘" title="Học hôm nay" description="Quay lại lộ trình chính" />
      </div>

      <p style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/" style={{ color: "var(--beego-muted)", fontWeight: 600, fontSize: "0.88rem" }}>
          Về Học hôm nay
        </Link>
      </p>
    </div>
  );
}
