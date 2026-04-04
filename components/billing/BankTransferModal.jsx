"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BankTransferModal.module.css";

export default function BankTransferModal({ open, onClose, plan, billingPeriod = "monthly" }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPayment(null);
      setError("");
      setConfirmMessage("");
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
      setConfirmMessage("");
      try {
        const res = await fetch("/api/payments/create", {
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
          setError(json.message || "Không tạo được yêu cầu thanh toán.");
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
  }, [open, plan]);

  const copyTransferContent = () => {
    if (!payment?.transferContent || typeof navigator === "undefined") return;
    try {
      void navigator.clipboard.writeText(payment.transferContent);
      setConfirmMessage("Đã copy nội dung chuyển khoản.");
    } catch {
      setConfirmMessage("Không copy được, hãy tự ghi lại nội dung.");
    }
  };

  const handleConfirmTransfer = async () => {
    if (!payment?.transferContent) return;
    setConfirming(true);
    setConfirmMessage("");
    setError("");
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferContent: payment.transferContent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Không xác nhận được thanh toán.");
        return;
      }
      if (json.data?.status === "admin_confirmed") {
        setConfirmMessage("Gói của bạn đã được admin kích hoạt trước đó.");
      } else if (json.data?.status === "user_confirmed") {
        setConfirmMessage(
          json.data?.message ||
            "Đã gửi yêu cầu, vui lòng chờ admin xác nhận sau khi nhận được tiền."
        );
      } else {
        setConfirmMessage("Đã ghi nhận. Vui lòng chờ admin xác nhận thanh toán.");
      }
    } catch {
      setError("Không xác nhận được thanh toán. Thử lại sau.");
    } finally {
      setConfirming(false);
    }
  };

  if (!open || !mounted) return null;

  const modal = (
    <div className={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="bank-transfer-title">
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="bank-transfer-title" className={styles.title}>
          Thanh toán chuyển khoản ngân hàng
        </h2>
        <p className={styles.subtitle}>
          Vui lòng chuyển khoản đúng <strong>số tiền</strong> và <strong>nội dung chuyển khoản</strong> bên dưới để hệ thống
          có thể kích hoạt gói Pro/VIP cho bạn.
        </p>

        {loading && <p className={styles.message}>Đang tạo yêu cầu thanh toán...</p>}
        {error && !loading && (
          <p className={`${styles.message} ${styles.error}`} role="alert">
            {error}
          </p>
        )}

        {payment && !loading && (
          <>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Thông tin thanh toán</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span>Chủ tài khoản:</span>
                  <strong>{payment.accountName}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Ngân hàng:</span>
                  <strong>{payment.bankName}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Số tài khoản:</span>
                  <strong>{payment.bankAccount}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Số tiền:</span>
                  <strong>{payment.amount.toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Gói & kỳ:</span>
                  <strong>
                    {String(payment.plan || plan || "").toUpperCase()} ·{" "}
                    {payment.billingPeriod === "yearly" || billingPeriod === "yearly" ? "Năm" : "Tháng"}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Nội dung chuyển khoản</h3>
              <p className={styles.transferContent}>
                <span className={styles.transferLabel}>Nội dung:</span>
                <span className={styles.transferValue}>{payment.transferContent}</span>
              </p>
              <button type="button" className={styles.copyBtn} onClick={copyTransferContent}>
                Copy nội dung chuyển khoản
              </button>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Quét mã QR</h3>
              <div className={styles.qrWrap}>
                <img src={payment.qrUrl} alt="Mã QR chuyển khoản ngân hàng" className={styles.qrImage} />
              </div>
              <p className={styles.qrNote}>
                Quét mã QR để chuyển khoản nhanh — ứng dụng ngân hàng sẽ tự điền số tiền và nội dung.
              </p>
            </section>
          </>
        )}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmTransfer}
            disabled={confirming || !payment}
          >
            {confirming ? "Đang xác nhận..." : "Tôi đã chuyển khoản"}
          </button>
        </div>

        {confirmMessage && (
          <p className={styles.confirmMessage} role="status">
            {confirmMessage}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

