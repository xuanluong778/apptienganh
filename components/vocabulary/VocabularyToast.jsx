"use client";

import { useEffect } from "react";

export default function VocabularyToast({ message = "", type = "info", onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = window.setTimeout(() => onClose?.(), 3200);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`beego-vocab-toast beego-vocab-toast--${type}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button type="button" className="beego-vocab-toast__close" onClick={onClose} aria-label="Đóng">
        ×
      </button>
    </div>
  );
}
