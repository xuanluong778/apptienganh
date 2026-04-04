"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const shell = {
  minHeight: "100vh",
  padding: "1rem",
  background: "linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%)",
  fontFamily: '"Fredoka", sans-serif',
};

const card = {
  width: "min(980px, 100%)",
  margin: "0 auto",
  background: "#fff",
  borderRadius: "22px",
  border: "4px solid #fff",
  boxShadow: "0 14px 0 rgba(35, 51, 104, 0.16)",
  padding: "1rem",
};

export default function AdminOptionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-settings", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Không tải được cấu hình (403 nếu không phải admin).");
        setItems([]);
        return;
      }
      const list = json.data?.items || [];
      setItems(list);
      setEncryptionEnabled(Boolean(json.data?.encryptionEnabled));
      setNote(String(json.data?.note || ""));
      const next = {};
      for (const it of list) {
        next[it.key] = it.secret ? "" : String(it.valueForForm ?? "");
      }
      setDraft(next);
    } catch (e) {
      setError(e?.message || "Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byGroup = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const g = it.group || "Khác";
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(it);
    }
    return m;
  }, [items]);

  const setField = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const clearKeyInDb = async (key) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [key]: "" } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Không gỡ được.");
        return;
      }
      setMessage("Đã gỡ khỏi database — app dùng lại .env nếu có.");
      await load();
    } catch (e) {
      setError(e?.message || "Lỗi mạng.");
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const settings = {};
    for (const it of items) {
      const raw = draft[it.key];
      const v = raw === undefined || raw === null ? "" : String(raw);
      if (it.secret) {
        if (v.trim() !== "") settings[it.key] = v.trim();
      } else {
        settings[it.key] = v.trim();
      }
    }
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Lưu thất bại.");
        return;
      }
      setMessage(json.message || "Đã lưu.");
      await load();
    } catch (e) {
      setError(e?.message || "Lỗi mạng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page" style={shell}>
      <section className="card" style={card}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
          <Link
            href="/admin"
            style={{
              fontWeight: 700,
              color: "#2f4f88",
              textDecoration: "none",
              border: "2px solid #c9d8ff",
              borderRadius: "12px",
              padding: "0.35rem 0.65rem",
            }}
          >
            ← Trang quản trị
          </Link>
        </div>
        <h1
          style={{
            margin: "0 0 0.4rem",
            color: "#2f4f88",
            textAlign: "center",
            fontFamily: '"Baloo 2", cursive',
          }}
        >
          Cấu hình (Options)
        </h1>
        <p style={{ textAlign: "center", color: "#4b66a0", fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.95rem" }}>
          Lưu API key và tham số vào database; ưu tiên hơn <code>.env</code> sau khi server load cache.{" "}
          {encryptionEnabled ? (
            <span style={{ color: "#1a7f37" }}>Mã hóa bí mật: bật (APP_SETTINGS_SECRET).</span>
          ) : (
            <span style={{ color: "#a61b1b" }}>Mã hóa bí mật: tắt — nên đặt APP_SETTINGS_SECRET trong .env.</span>
          )}
        </p>
        {note ? (
          <p style={{ fontSize: "0.85rem", color: "#5a6b8a", marginBottom: "0.75rem", textAlign: "center" }}>{note}</p>
        ) : null}

        {error ? (
          <div
            style={{
              background: "#ffe8e8",
              color: "#8b1c1c",
              padding: "0.6rem 0.75rem",
              borderRadius: "12px",
              marginBottom: "0.75rem",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            style={{
              background: "#e6f7ed",
              color: "#1a5c2e",
              padding: "0.6rem 0.75rem",
              borderRadius: "12px",
              marginBottom: "0.75rem",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        ) : null}

        {loading ? (
          <p style={{ textAlign: "center", color: "#4b66a0" }}>Đang tải…</p>
        ) : (
          <>
            {[...byGroup.entries()].map(([group, rows]) => (
              <fieldset
                key={group}
                style={{
                  border: "2px dashed #c9d8ff",
                  borderRadius: "16px",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                }}
              >
                <legend style={{ fontWeight: 800, color: "#2f4f88", padding: "0 0.35rem" }}>{group}</legend>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {rows.map((it) => (
                    <div key={it.key}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "baseline", marginBottom: "0.25rem" }}>
                        <label htmlFor={it.key} style={{ fontWeight: 700, color: "#2f4f88", flex: "1 1 200px" }}>
                          {it.label}
                        </label>
                        {it.storedInDatabase ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1a7f37", background: "#e8f5e9", padding: "0.15rem 0.45rem", borderRadius: "8px" }}>
                            DB
                          </span>
                        ) : null}
                        {it.secret && it.storedInDatabase ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => clearKeyInDb(it.key)}
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              border: "1px solid #c9d8ff",
                              background: "#f7fbff",
                              borderRadius: "8px",
                              cursor: saving ? "wait" : "pointer",
                              color: "#2f4f88",
                            }}
                          >
                            Gỡ khỏi DB
                          </button>
                        ) : null}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#5a6b8a", marginBottom: "0.25rem" }}>{it.hint}</div>
                      <input
                        id={it.key}
                        type={it.secret ? "password" : "text"}
                        autoComplete="off"
                        placeholder={it.placeholder || (it.secret ? "Để trống = giữ nguyên; nhập mới để cập nhật" : "")}
                        value={draft[it.key] ?? ""}
                        onChange={(e) => setField(it.key, e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.5rem 0.65rem",
                          borderRadius: "12px",
                          border: "2px solid #d6e4ff",
                          fontSize: "0.95rem",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                disabled={saving}
                onClick={saveAll}
                style={{
                  fontWeight: 800,
                  fontSize: "1rem",
                  padding: "0.65rem 1.4rem",
                  borderRadius: "16px",
                  border: "none",
                  background: saving ? "#b8c9e6" : "linear-gradient(180deg, #6ec6ff, #4fa8f7)",
                  color: "#fff",
                  cursor: saving ? "wait" : "pointer",
                  boxShadow: "0 6px 0 rgba(35, 51, 104, 0.2)",
                }}
              >
                {saving ? "Đang lưu…" : "Lưu cấu hình"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
