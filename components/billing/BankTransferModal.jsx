"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BankTransferModal.module.css";

export default function BankTransferModal({ open, onClose, plan, billingPeriod = "monthly" }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const sepayFormRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPayment(null);
      setError("");
      submittedRef.current = false;
      return;
    }
    if (!plan) {
      setError("Chọn gói Pro hoặc VIP trước khi thanh toán.");
      return;
    }

    let cancelled = false;
    async function createPayment() {
      setLoading(true);
      setError("");
      submittedRef.current = false;
      try {
        const res = await fetch("/api/payments/sepay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            billing_period: billingPeriod === "yearly" ? "yearly" : "monthly",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.message || "Không tạo được yêu cầu thanh toán SePay.");
          setPayment(null);
          return;
        }
        setPayment(json.data);
      } catch {
        if (!cancelled) {
          setError("Không kết nối được server. Thử lại sau.");
          setPayment(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void createPayment();
    return () => {
      cancelled = true;
    };
  }, [open, plan, billingPeriod]);

  useEffect(() => {
    if (!payment || payment.mode !== "sepay" || submittedRef.current) return;
    const t = window.setTimeout(() => {
      const el = sepayFormRef.current;
      if (el && !submittedRef.current) {
        submittedRef.current = true;
        el.submit();
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [payment]);

  if (!open || !mounted) return null;

  const isSepay = payment?.mode === "sepay" && payment?.actionUrl && payment?.fields;

  const modal = (
    <div className={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="bank-transfer-title">
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="bank-transfer-title" className={styles.title}>
          Thanh toán qua SePay
        </h2>
        <p className={styles.subtitle}>
          Bạn sẽ được chuyển tới cổng thanh toán SePay (quét QR / chuyển khoản tự động đối soát). Sau khi thanh toán
          thành công, gói Pro/VIP được kích hoạt tự động — không cần admin xác nhận.
        </p>

        {loading && <p className={styles.message}>Đang chuẩn bị phiên thanh toán…</p>}
        {error && !loading && (
          <p className={`${styles.message} ${styles.error}`} role="alert">
            {error}
          </p>
        )}

        {isSepay && !loading && (
          <>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Đơn của bạn</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span>Số tiền:</span>
                  <strong>{Number(payment.amount).toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Gói & kỳ:</span>
                  <strong>
                    {String(payment.plan || plan || "").toUpperCase()} ·{" "}
                    {payment.billingPeriod === "yearly" || billingPeriod === "yearly" ? "Năm" : "Tháng"}
                  </strong>
                </div>
                {payment.orderInvoiceNumber ? (
                  <div className={styles.infoRow}>
                    <span>Mã đơn:</span>
                    <strong className={styles.transferValue}>{payment.orderInvoiceNumber}</strong>
                  </div>
                ) : null}
              </div>
            </section>

            <p className={styles.message}>Đang mở cổng thanh toán SePay… (nếu trình duyệt chặn popup, hãy cho phép chuyển trang)</p>

            <form ref={sepayFormRef} action={payment.actionUrl} method="POST" className={styles.visuallyHidden}>
              {Object.entries(payment.fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <noscript>
                <button type="submit">Tiếp tục thanh toán SePay</button>
              </noscript>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
