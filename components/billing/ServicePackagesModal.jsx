"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { startStripeCheckout, trackBillingClientEvent } from "@/lib/billing/checkout-client";
import { amountVndForPlan, YEARLY_PRICE_FACTOR } from "@/lib/billing/plan-pricing";
import BankTransferModal from "@/components/billing/BankTransferModal";
import ps from "./PaywallModal.module.css";
import styles from "./ServicePackagesModal.module.css";

function formatVnd(n) {
  return `${Number(n).toLocaleString("vi-VN")} ₫`;
}

/**
 * Bảng chọn gói (tháng/năm) — dùng từ menu "Gói dịch vụ" và nút header.
 * @param {string} userPlan — trial | pro | vip | expired từ /api/auth/me
 */
export default function ServicePackagesModal({ open, onClose, userPlan = "expired", source = "service_packages" }) {
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const loggedRef = useRef(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankPlan, setBankPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const proActive = userPlan === "pro";
  const vipActive = userPlan === "vip";
  const proLocked = proActive || vipActive;
  const vipLocked = vipActive;

  const proAmount = amountVndForPlan("pro", billingPeriod);
  const vipAmount = amountVndForPlan("vip", billingPeriod);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = useCallback(
    async (plan) => {
      if (plan === "pro" && proLocked) return;
      if (plan === "vip" && vipLocked) return;
      setError("");
      setLoadingPlan(plan);
      try {
        await startStripeCheckout(plan, { billingPeriod });
      } catch (e) {
        setError(e?.message || "Checkout failed.");
        setLoadingPlan(null);
      }
    },
    [billingPeriod, proLocked, vipLocked]
  );

  useEffect(() => {
    if (!open) {
      loggedRef.current = false;
      return;
    }
    if (loggedRef.current) return;
    loggedRef.current = true;
    void trackBillingClientEvent("paywall_shown", {
      source: source && String(source).trim() ? source : "service_packages",
      surface: "service_packages_modal",
    });
  }, [open, source]);

  useEffect(() => {
    if (!open) {
      setLoadingPlan(null);
      setError("");
      setBankOpen(false);
      setBankPlan(null);
      setBillingPeriod("monthly");
      return;
    }
    const onKey = (ev) => {
      if (ev.key !== "Escape") return;
      if (bankOpen) {
        setBankOpen(false);
        setBankPlan(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, bankOpen]);

  const openBankForPlan = useCallback(
    (plan) => {
      if (plan === "pro" && proLocked) return;
      if (plan === "vip" && vipLocked) return;
      setBankPlan(plan);
      setBankOpen(true);
    },
    [proLocked, vipLocked]
  );

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const t = window.setTimeout(() => panelRef.current?.focus?.(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open || !mounted) return null;

  const yearlyPct = Math.round((1 - YEARLY_PRICE_FACTOR) * 100);

  const modal = (
    <div
      className={ps.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={ps.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-pkg-title"
        tabIndex={-1}
      >
        <button type="button" className={ps.closeBtn} onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="svc-pkg-title" className={ps.title}>
          Gói dịch vụ
        </h2>
        <p className={ps.subtitle}>
          Chọn kỳ thanh toán và gói Pro hoặc VIP. Gói bạn đang dùng được đánh dấu <strong>Đã Active</strong>.
        </p>

        <div className={ps.billingToggle} role="group" aria-label="Kỳ thanh toán">
          <button
            type="button"
            className={`${ps.billingOpt} ${billingPeriod === "monthly" ? ps.billingOptOn : ""}`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Theo tháng
          </button>
          <button
            type="button"
            className={`${ps.billingOpt} ${billingPeriod === "yearly" ? ps.billingOptOn : ""}`}
            onClick={() => setBillingPeriod("yearly")}
          >
            Theo năm (−{yearlyPct}%)
          </button>
        </div>

        <ul className={ps.pricingList}>
          <li className={`${ps.planRow} ${proActive ? styles.planRowActive : ""}`}>
            <span className={`${ps.planName} ${styles.planTitle}`}>
              Pro
              {proActive ? <span className={styles.activeBadge}>Đã Active</span> : null}
            </span>
            <span className={ps.planQuota}>
              300k tokens/tháng · {formatVnd(proAmount)}
              {billingPeriod === "yearly" ? " / năm" : " / tháng"}
            </span>
          </li>
          <li className={`${ps.planRow} ${vipActive ? styles.planRowActive : ""}`}>
            <span className={`${ps.planName} ${styles.planTitle}`}>
              VIP
              {vipActive ? <span className={styles.activeBadge}>Đã Active</span> : null}
            </span>
            <span className={ps.planQuota}>
              500k tokens/tháng · {formatVnd(vipAmount)}
              {billingPeriod === "yearly" ? " / năm" : " / tháng"}
            </span>
          </li>
        </ul>

        {error ? (
          <p className={ps.err} role="alert">
            {error}
          </p>
        ) : null}

        <div className={ps.actions}>
          <button
            type="button"
            className={`${ps.btn} ${ps.btnPro}`}
            disabled={loadingPlan !== null || proLocked}
            onClick={() => handleCheckout("pro")}
          >
            {proLocked
              ? proActive
                ? "Pro — Đã Active"
                : "Đã có VIP"
              : loadingPlan === "pro"
                ? "Đang mở thanh toán…"
                : `Thanh toán Pro (${formatVnd(proAmount)})`}
          </button>
          <button
            type="button"
            className={`${ps.btn} ${ps.btnVip}`}
            disabled={loadingPlan !== null || vipLocked}
            onClick={() => handleCheckout("vip")}
          >
            {vipLocked
              ? "VIP — Đã Active"
              : loadingPlan === "vip"
                ? "Đang mở thanh toán…"
                : `Thanh toán VIP (${formatVnd(vipAmount)})`}
          </button>
        </div>

        <div className={ps.bankRow}>
          <button
            type="button"
            className={ps.btnBank}
            disabled={loadingPlan !== null || proLocked}
            onClick={() => openBankForPlan("pro")}
          >
            SePay · Pro ({formatVnd(proAmount)})
          </button>
          <button
            type="button"
            className={ps.btnBank}
            disabled={loadingPlan !== null || vipLocked}
            onClick={() => openBankForPlan("vip")}
          >
            SePay · VIP ({formatVnd(vipAmount)})
          </button>
        </div>
        <p className={ps.bankHint}>
          Thanh toán VN qua SePay (QR / chuyển khoản tự động). Kích hoạt gói ngay sau khi thanh toán thành công.
        </p>

        <p className={ps.footerNote}>Thanh toán thẻ qua Stripe. Bạn có thể hủy trong cổng khách hàng.</p>

        <BankTransferModal
          open={bankOpen}
          plan={bankPlan}
          billingPeriod={billingPeriod}
          onClose={() => {
            setBankOpen(false);
            setBankPlan(null);
          }}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
