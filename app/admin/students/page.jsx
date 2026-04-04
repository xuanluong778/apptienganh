"use client";

import { useEffect, useState, useCallback } from "react";
import adminTable from "@/components/admin/AdminTable.module.css";

export default function AdminStudentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams({ page: "1", limit: "50" });
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/admin/students?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMsg(json.message || "Không tải được danh sách học viên.");
        setItems([]);
        return;
      }
      setItems(json.data || []);
    } catch {
      setMsg("Lỗi kết nối khi tải danh sách học viên.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (value) => {
    if (!value) return "--";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleString("vi-VN");
  };

  function applySearch(e) {
    e?.preventDefault?.();
    setQ(qInput.trim());
  }

  return (
    <main className="page" style={{ minHeight: "100vh", padding: "1rem" }}>
      <section
        className="card"
        style={{
          width: "min(1100px, 100%)",
          margin: "0 auto",
          background: "#fff",
          borderRadius: 22,
          border: "4px solid #fff",
          boxShadow: "0 14px 0 rgba(35,51,104,0.16)",
          padding: "1rem",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem", color: "#2f4f88", textAlign: "center" }}>
          Danh sách học viên
        </h1>
        <form className={adminTable.searchRow} onSubmit={applySearch}>
          <input
            className={adminTable.searchInput}
            type="search"
            placeholder="Tìm theo tên hoặc email…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            enterKeyHint="search"
          />
          <button type="submit" className={adminTable.searchBtn}>
            Tìm kiếm
          </button>
        </form>
        {msg && (
          <p
            style={{
              margin: "0.3rem 0",
              padding: "0.4rem 0.6rem",
              borderRadius: 12,
              background: "#f5f9ff",
              border: "2px dashed #c9d8ff",
              color: "#36558b",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {msg}
          </p>
        )}
        {loading && <p style={{ textAlign: "center" }}>Đang tải...</p>}
        {!loading && items.length === 0 && (
          <p style={{ textAlign: "center" }}>Chưa có học viên khớp bộ lọc.</p>
        )}
        {!loading && items.length > 0 && (
          <div className={adminTable.wrap}>
            <table className={adminTable.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Ngày đăng ký</th>
                  <th>Đăng nhập gần nhất</th>
                  <th>Số lần đăng nhập</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>{formatDate(u.last_login_at)}</td>
                    <td>{Number(u.login_count || 0)}</td>
                    <td>{Number(u.active_sessions || 0) > 0 ? "Đang online" : "Offline"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
