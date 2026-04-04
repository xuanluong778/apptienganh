"use client";

import { useEffect, useState, useCallback } from "react";
import adminTable from "@/components/admin/AdminTable.module.css";

export default function AdminPaymentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      const url = `/api/admin/payments${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMsg(json.message || "Không tải được danh sách thanh toán.");
        setItems([]);
        return;
      }
      setItems(json.data || []);
    } catch {
      setMsg("Lỗi kết nối khi tải danh sách thanh toán.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmPayment(id) {
    const ok = window.confirm("Xác nhận đã nhận tiền và nâng cấp tài khoản?");
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMsg(json.message || "Không xác nhận được thanh toán.");
        return;
      }
      setMsg("Đã nâng cấp tài khoản thành công.");
      load();
    } catch {
      setMsg("Lỗi kết nối khi xác nhận thanh toán.");
    }
  }

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
          Thanh toán chuyển khoản
        </h1>
        <form className={adminTable.searchRow} onSubmit={applySearch}>
          <input
            className={adminTable.searchInput}
            type="search"
            placeholder="Tìm theo email, tên hoặc nội dung CK…"
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
          <p style={{ textAlign: "center" }}>Không có dòng nào khớp bộ lọc.</p>
        )}
        {!loading && items.length > 0 && (
          <div className={adminTable.wrap}>
            <table className={adminTable.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Gói</th>
                  <th>Kỳ</th>
                  <th>Trạng thái</th>
                  <th>Số tiền</th>
                  <th>Nội dung CK</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name || p.user_id}</td>
                    <td>{p.email}</td>
                    <td>{String(p.plan || "").toUpperCase()}</td>
                    <td>{p.billing_period === "yearly" ? "Năm" : "Tháng"}</td>
                    <td>
                      {p.status === "admin_confirmed" ? (
                        <span style={{ fontWeight: 700, color: "#2e7d32" }}>Đã xác nhận</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: "#ef6c00" }}>Chờ admin</span>
                      )}
                    </td>
                    <td>{Number(p.amount || 0).toLocaleString("vi-VN")} đ</td>
                    <td style={{ maxWidth: 200, wordBreak: "break-all" }}>{p.transfer_content}</td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      {p.status === "admin_confirmed" ? (
                        <span className={adminTable.badgeDone}>
                          Gói {String(p.plan || "").toUpperCase()}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={adminTable.btnPrimary}
                          onClick={() => confirmPayment(p.id)}
                        >
                          Xác nhận nâng cấp
                        </button>
                      )}
                    </td>
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
