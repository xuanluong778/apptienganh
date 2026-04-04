"use client";

import { useEffect, useMemo, useState } from "react";
import { usePaywall } from "@/components/billing/PaywallProvider";

export default function DashboardPage() {
  const { openPaywall } = usePaywall();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({
    completed_lessons: 0,
    total_lessons: 0,
    average_score: 0,
    lessons: [],
  });
  const [studentsProgress, setStudentsProgress] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (!meRes.ok || !meData.success) {
          throw new Error("Please login to view your dashboard.");
        }
        setUser(meData.data);

        const progressRes = await fetch("/api/progress", { cache: "no-store" });
        const progressData = await progressRes.json();
        if (!progressRes.ok || !progressData.success) {
          throw new Error(progressData.message || "Could not load progress.");
        }

        setProgress(progressData.data);

        const studentsRes = await fetch("/api/progress/students", { cache: "no-store" });
        const studentsData = await studentsRes.json();
        if (studentsRes.ok && studentsData.success) {
          setStudentsProgress(studentsData.data || []);
        } else {
          setStudentsProgress([]);
        }
      } catch (err) {
        setError(err.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (loading || error) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#lich-su") return;
    window.requestAnimationFrame(() => {
      document.getElementById("lich-su")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading, error]);

  const progressPercent = useMemo(() => {
    if (!progress.total_lessons) {
      return 0;
    }
    return Math.round((progress.completed_lessons / progress.total_lessons) * 100);
  }, [progress.completed_lessons, progress.total_lessons]);

  return (
    <main className="page">
      <section className="card">
        <h1>My Dashboard</h1>
        {loading && <p className="message">Loading dashboard...</p>}
        {!loading && error && <p className="message error">{error}</p>}

        {!loading && !error && (
          <>
            <p className="hello">Hi {user?.name}, keep learning every day!</p>

            <div className="subRow">
              <div className="subCard">
                <div className="subLabel">Gói &amp; dùng thử</div>
                <div className="subMain">
                  {user?.plan === "vip" && <span className="subStrong">Bạn đang dùng gói VIP.</span>}
                  {user?.plan === "pro" && <span className="subStrong">Bạn đang dùng gói Pro.</span>}
                  {user?.plan === "trial" && user?.trial?.is_active && (
                    <span className="subStrong">
                      Dùng miễn phí còn <span className="subDays">{user.trial.days_remaining} ngày</span>.
                    </span>
                  )}
                  {user?.plan === "expired" && (
                    <span className="subStrong warn">
                      Hết hạn dùng thử — còn 0 ngày miễn phí. Nâng cấp để tiếp tục học với AI.
                    </span>
                  )}
                </div>
                {user?.plan !== "vip" ? (
                  <button
                    type="button"
                    className="upgradeBtn"
                    onClick={() =>
                      openPaywall({
                        message:
                          user?.plan === "pro"
                            ? "Nâng cấp VIP để dùng thêm quota và tính năng cao cấp."
                            : "Nâng cấp Pro để tiếp tục dùng AI — thanh toán thẻ hoặc chuyển khoản.",
                        source: "dashboard",
                      })
                    }
                  >
                    {user?.plan === "pro" ? "Nâng cấp VIP" : "Nâng cấp Pro"}
                  </button>
                ) : (
                  <p className="subThanks">Cảm ơn bạn đã hỗ trợ ứng dụng.</p>
                )}
              </div>
            </div>

            <div id="lich-su" className="stats">
              <div className="pill">
                <span>Completed Lessons</span>
                <strong>{progress.completed_lessons}</strong>
              </div>
              <div className="pill">
                <span>Average Score</span>
                <strong>{progress.average_score}</strong>
              </div>
            </div>

            <div className="progressWrap">
              <div className="progressTop">
                <span>Learning Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="bar">
                <div className="fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <h2>Lesson Scores</h2>
            {progress.lessons.length === 0 ? (
              <p className="empty">No lesson progress yet. Start a lesson or game first!</p>
            ) : (
              <ul className="list">
                {progress.lessons.map((item) => (
                  <li key={item.lesson_id}>
                    <span>{item.word}</span>
                    <strong>{Math.round(Number(item.score || 0))}</strong>
                  </li>
                ))}
              </ul>
            )}

            <h2 style={{ marginTop: "0.9rem" }}>Cột tiến độ học tập học viên</h2>
            {studentsProgress.length === 0 ? (
              <p className="empty">Chưa có dữ liệu học viên.</p>
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Học từ vựng</th>
                      <th>Bài hoàn thành</th>
                      <th>Điểm bài TB</th>
                      <th>Chat 7 ngày</th>
                      <th>Voice 7 ngày</th>
                      <th>Phát âm TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsProgress.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name} ({item.email || "--"})</td>
                        <td>{Number(item.vocabulary_learned || 0)}</td>
                        <td>{Number(item.completed_count || 0)}/{Number(item.lesson_count || 0)}</td>
                        <td>{item.avg_lesson_score ?? 0}</td>
                        <td>{Number(item.chat_7d || 0)}</td>
                        <td>{Number(item.voice_7d || 0)}</td>
                        <td>{item.avg_pronunciation ?? "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: "Fredoka", sans-serif;
        }

        .card {
          width: min(820px, 96vw);
          background: #fff;
          border: 4px solid #fff;
          border-radius: 24px;
          box-shadow: 0 14px 0 rgba(36, 52, 104, 0.16);
          padding: 1rem;
        }

        h1 {
          margin: 0;
          text-align: center;
          color: #2f4f88;
          font-size: 2rem;
          font-family: "Baloo 2", cursive;
        }

        .hello {
          text-align: center;
          color: #50689e;
          font-weight: 600;
          margin: 0.5rem 0 0.8rem;
        }

        .subRow {
          margin-bottom: 0.9rem;
        }

        .subCard {
          background: linear-gradient(135deg, #f0f7ff 0%, #fff8f5 100%);
          border: 3px solid #c9d8ff;
          border-radius: 18px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          align-items: stretch;
        }

        .subLabel {
          font-size: 0.8rem;
          font-weight: 800;
          color: #5a6fa8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .subMain {
          font-size: 0.98rem;
          font-weight: 600;
          color: #3a5890;
          line-height: 1.45;
          text-align: center;
        }

        .subStrong {
          display: block;
        }

        .subStrong.warn {
          color: #8a3d16;
        }

        .subDays {
          font-family: "Baloo 2", cursive;
          font-size: 1.25rem;
          font-weight: 800;
          color: #2f4f88;
        }

        .upgradeBtn {
          border: 3px solid #fff;
          border-radius: 999px;
          padding: 0.65rem 1rem;
          font: inherit;
          font-weight: 800;
          font-size: 0.98rem;
          cursor: pointer;
          background: linear-gradient(180deg, #72d9ff, #4f8cff);
          color: #fff;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.12);
        }

        .upgradeBtn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);
        }

        .subThanks {
          margin: 0;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 700;
          color: #3a7d4a;
        }

        .message {
          text-align: center;
          margin: 0.6rem 0;
          padding: 0.5rem 0.7rem;
          border-radius: 12px;
          background: #f5f9ff;
          border: 2px dashed #c8d7ff;
          color: #36558b;
        }

        .error {
          color: #9c2f2f;
          background: #fff3f3;
          border-color: #ffc7c7;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          margin-bottom: 0.8rem;
        }

        .pill {
          background: #eef3ff;
          border: 2px dashed #c9d8ff;
          border-radius: 16px;
          padding: 0.7rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #50689e;
          font-weight: 700;
        }

        .pill strong {
          color: #2f4f88;
          font-size: 1.3rem;
          font-family: "Baloo 2", cursive;
        }

        .progressWrap {
          background: #f7fbff;
          border: 2px dashed #c9d8ff;
          border-radius: 16px;
          padding: 0.7rem;
          margin-bottom: 0.9rem;
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          color: #4f67a0;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }

        .bar {
          height: 14px;
          border-radius: 999px;
          background: #e7eeff;
          overflow: hidden;
        }

        .fill {
          height: 100%;
          background: linear-gradient(90deg, #67d7ff, #8f7cff);
          transition: width 0.3s ease;
        }

        h2 {
          margin: 0 0 0.5rem;
          color: #2f4f88;
          font-family: "Baloo 2", cursive;
        }

        .empty {
          color: #5169a0;
          background: #f5f9ff;
          border: 2px dashed #c9d8ff;
          border-radius: 12px;
          padding: 0.6rem;
        }

        .list {
          list-style: none;
          display: grid;
          gap: 0.45rem;
          margin: 0;
          padding: 0;
        }

        .list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px;
          background: #f7fbff;
          border: 2px dashed #c9d8ff;
          padding: 0.5rem 0.65rem;
          color: #426096;
          font-weight: 700;
        }

        .list strong {
          color: #2f4f88;
          font-family: "Baloo 2", cursive;
          font-size: 1.2rem;
        }
        .tableWrap {
          margin-top: 0.5rem;
          border: 2px dashed #c9d8ff;
          border-radius: 12px;
          overflow: auto;
          background: #fff;
          max-height: 340px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .table th,
        .table td {
          border-bottom: 1px solid #e8efff;
          padding: 0.45rem 0.5rem;
          text-align: left;
          color: #3f5f96;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .table th {
          background: #f5f9ff;
          color: #2f4f88;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        @media (max-width: 700px) {
          .stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
