"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startStripeCheckout, trackBillingClientEvent } from "@/lib/billing/checkout-client";
import { amountVndForPlan, YEARLY_PRICE_FACTOR } from "@/lib/billing/plan-pricing";
import BankTransferModal from "@/components/billing/BankTransferModal";
import styles from "./PaywallModal.module.css";

const DEFAULT_MESSAGE = "Your free trial has ended. Please upgrade to keep using AI features.";

function formatVnd(n) {
  return `${Number(n).toLocaleString("vi-VN")} ₫`;
}

export default function PaywallModal({ open, onClose, message, source = "" }) {
  const panelRef = useRef(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const paywallLoggedRef = useRef(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankPlan, setBankPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const displayMessage = (message && String(message).trim()) || DEFAULT_MESSAGE;

  const proAmount = amountVndForPlan("pro", billingPeriod);
  const vipAmount = amountVndForPlan("vip", billingPeriod);

  const handleCheckout = useCallback(
    async (plan) => {
      setError("");
      setLoadingPlan(plan);
      try {
        await startStripeCheckout(plan, { billingPeriod });
      } catch (e) {
        setError(e?.message || "Checkout failed.");
        setLoadingPlan(null);
      }
    },
    [billingPeriod]
  );

  useEffect(() => {
    if (!open) {
      paywallLoggedRef.current = false;
      return;
    }
    if (paywallLoggedRef.current) return;
    paywallLoggedRef.current = true;
    void trackBillingClientEvent("paywall_shown", {
      source: source && String(source).trim() ? source : "unknown",
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

  const openBankForPlan = useCallback((plan) => {
    setBankPlan(plan);
    setBankOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const t = window.setTimeout(() => {
      panelRef.current?.focus?.();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const yearlyPct = Math.round((1 - YEARLY_PRICE_FACTOR) * 100);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        tabIndex={-1}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="paywall-title" className={styles.title}>
          Continue learning with AI
        </h2>
        <p className={styles.subtitle}>{displayMessage}</p>

        <div className={styles.billingToggle} role="group" aria-label="Kỳ thanh toán">
          <button
            type="button"
            className={`${styles.billingOpt} ${billingPeriod === "monthly" ? styles.billingOptOn : ""}`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Theo tháng
          </button>
          <button
            type="button"
            className={`${styles.billingOpt} ${billingPeriod === "yearly" ? styles.billingOptOn : ""}`}
            onClick={() => setBillingPeriod("yearly")}
          >
            Theo năm (−{yearlyPct}%)
          </button>
        </div>

        <ul className={styles.pricingList}>
          <li className={styles.planRow}>
            <span className={styles.planName}>Pro</span>
            <span className={styles.planQuota}>
              300k tokens / month · {formatVnd(proAmount)}
              {billingPeriod === "yearly" ? " / năm" : " / tháng"}
            </span>
          </li>
          <li className={styles.planRow}>
            <span className={styles.planName}>VIP</span>
            <span className={styles.planQuota}>
              500k tokens / month · {formatVnd(vipAmount)}
              {billingPeriod === "yearly" ? " / năm" : " / tháng"}
            </span>
          </li>
        </ul>

        {error ? (
          <p className={styles.err} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPro}`}
            disabled={loadingPlan !== null}
            onClick={() => handleCheckout("pro")}
          >
            {loadingPlan === "pro" ? "Opening checkout…" : `Upgrade to Pro (${formatVnd(proAmount)})`}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnVip}`}
            disabled={loadingPlan !== null}
            onClick={() => handleCheckout("vip")}
          >
            {loadingPlan === "vip" ? "Opening checkout…" : `Upgrade to VIP (${formatVnd(vipAmount)})`}
          </button>
        </div>

        <div className={styles.bankRow}>
          <button
            type="button"
            className={styles.btnBank}
            disabled={loadingPlan !== null}
            onClick={() => openBankForPlan("pro")}
          >
            Bank transfer · Pro ({formatVnd(proAmount)})
          </button>
          <button
            type="button"
            className={styles.btnBank}
            disabled={loadingPlan !== null}
            onClick={() => openBankForPlan("vip")}
          >
            Bank transfer · VIP ({formatVnd(vipAmount)})
          </button>
        </div>
        <p className={styles.bankHint}>
          Việt Nam: chuyển khoản ACB, QR VietQR tự điền số tiền và nội dung theo gói bạn chọn.
        </p>

        <p className={styles.footerNote}>Secure payment via Stripe. You can cancel anytime in the customer portal.</p>

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
}
