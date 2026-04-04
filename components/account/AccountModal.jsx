"use client";

import { useEffect, useState } from "react";
import styles from "./AccountModal.module.css";

const STORAGE_KEY = "apptienganh_remember_login";

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AccountModal({ open, onClose, user }) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      setRemember(v !== "0");
    } catch {
      setRemember(true);
    }
    setShowPassword(false);
  }, [open]);

  function toggleRemember(checked) {
    setRemember(checked);
    try {
      window.localStorage.setItem(STORAGE_KEY, checked ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  if (!open || !user) return null;

  const email = String(user.email || "").trim();
  const phone = String(user.phone || "").trim();
  const displayId = email || phone || "—";

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="acc-title">
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="acc-title" className={styles.title}>
          Tài khoản
        </h2>

        <div className={styles.row}>
          <span className={styles.label}>Họ tên</span>
          <div className={styles.value}>{String(user.name || "—")}</div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Email / SĐT đăng nhập</span>
          <div className={styles.value}>{displayId}</div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Mật khẩu</span>
          <div className={styles.pwRow}>
            <input
              className={styles.pwInput}
              type={showPassword ? "text" : "password"}
              readOnly
              autoComplete="off"
              value={
                showPassword
                  ? "Không hiển thị — để bảo vệ tài khoản (đăng nhập OTP hoặc mật khẩu không lưu dạng đọc được)."
                  : "********"
              }
            />
            <button
              type="button"
              className={styles.eyeBtn}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện gợi ý mật khẩu"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          <p className={styles.hint}>
            Ứng dụng không hiển thị mật khẩu thật. Bấm biểu tượng mắt để đọc hướng dẫn bảo mật.
          </p>
        </div>

        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => toggleRemember(e.target.checked)}
          />
          Lưu đăng nhập trên thiết bị này
        </label>
      </div>
    </div>
  );
}
