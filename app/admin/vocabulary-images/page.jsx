"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function AdminVocabularyImagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/vocabulary/images?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Không tải được danh sách ảnh.");
        setItems([]);
        setTotal(0);
      } else {
        setItems(json.data || []);
        setTotal(Number(json.pagination?.total || 0));
      }
    } catch {
      setError("Lỗi kết nối.");
      setItems([]);
      setTotal(0);
    }
    setLoading(false);
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action, ids) {
    const res = await fetch("/api/admin/vocabulary/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.message || "Thao tác thất bại.");
      return;
    }
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main style={{ minHeight: "100vh", padding: "1rem", background: "#f8fafc" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <h1 style={{ margin: "0 0 0.5rem" }}>Duyệt ảnh từ vựng</h1>
        <p style={{ color: "#475569", marginBottom: "1rem" }}>
          Regenerate theo prompt ngữ nghĩa · Approve / Reject
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 999,
                border: status === s ? "2px solid #2563eb" : "1px solid #e2e8f0",
                background: status === s ? "#eff6ff" : "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? <p>Đang tải…</p> : null}
        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <img
                src={item.image_url}
                alt={item.word}
                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
              />
              <div style={{ padding: 10 }}>
                <strong>
                  {item.word}
                </strong>
                <p style={{ margin: "4px 0", fontSize: 13, color: "#475569" }}>
                  {item.vietnamese_meaning}
                </p>
                <p style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>
                  {item.semantic_hint?.slice(0, 120)}
                  {item.semantic_hint?.length > 120 ? "…" : ""}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" onClick={() => runAction("approve", [item.id])}>
                    Duyệt
                  </button>
                  <button type="button" onClick={() => runAction("reject", [item.id])}>
                    Từ chối
                  </button>
                  <button type="button" onClick={() => runAction("regenerate", [item.id])}>
                    Tạo lại
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>
            {page}/{totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sau
          </button>
        </div>
      </section>
    </main>
  );
}
