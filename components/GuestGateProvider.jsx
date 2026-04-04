"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./GuestGate.module.css";

const MSG = "Bạn hãy đăng nhập tài khoản để được sử dụng phần mềm.";

const GuestGateContext = createContext(null);

function GuestToast({ onClose, onGoAuth }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const t = window.setTimeout(() => closeRef.current?.(), 7000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={styles.toast} role="alert">
      {MSG}
      <div className={styles.toastActions}>
        <button type="button" className={styles.toastBtn} onClick={onGoAuth}>
          Đăng nhập
        </button>
        <button type="button" className={`${styles.toastBtn} ${styles.toastBtnSecondary}`} onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

export default function GuestGateProvider({ children }) {
  const router = useRouter();
  const [toastOpen, setToastOpen] = useState(false);

  const showLoginRequired = useCallback(() => setToastOpen(true), []);

  const goAuth = useCallback(() => {
    setToastOpen(false);
    const next =
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
    router.push(`/auth?next=${encodeURIComponent(next === "/auth" ? "/" : next)}`);
  }, [router]);

  const value = useMemo(() => ({ showLoginRequired }), [showLoginRequired]);

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      {toastOpen ? <GuestToast onClose={() => setToastOpen(false)} onGoAuth={goAuth} /> : null}
    </GuestGateContext.Provider>
  );
}

export function useGuestGate() {
  const ctx = useContext(GuestGateContext);
  if (!ctx) {
    throw new Error("useGuestGate must be used within GuestGateProvider");
  }
  return ctx;
}
