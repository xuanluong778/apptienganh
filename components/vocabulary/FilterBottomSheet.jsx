"use client";

import { useEffect } from "react";

export default function FilterBottomSheet({ open, onClose, title = "Bộ lọc", children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        alignItems: "end",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 16,
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          boxShadow: "0 -12px 30px rgba(0,0,0,0.18)",
          maxHeight: "80dvh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <strong style={{ fontFamily: "var(--font-heading), Oswald, sans-serif", fontSize: "1.05rem" }}>
            {title}
          </strong>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            style={{
              marginLeft: "auto",
              minWidth: 48,
              minHeight: 48,
              border: "none",
              background: "#f1f5f9",
              borderRadius: 14,
              fontSize: "1.1rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        {children}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              minHeight: 52,
              borderRadius: 999,
              border: "2px solid var(--beego-border)",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

