"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./success.module.css";

const REDIRECT_MS = 4500;
const REDIRECT_TO = "/dashboard";

function planLabel(plan) {
  if (plan === "vip") return "VIP";
  if (plan === "pro") return "Pro";
  return "your new plan";
}

export default function BillingSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading");
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing checkout session. Return to the app and try again.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !json.success) {
          setStatus("error");
          setMessage(json.message || "Could not verify your payment.");
          return;
        }

        const p = json.data?.plan;
        const isPaid = Boolean(json.data?.paid);
        setPlan(p || null);

        if (!isPaid) {
          setStatus("pending");
          setMessage(
            "We’re still confirming your payment. Your subscription will update in a moment—check your email or try again shortly."
          );
          return;
        }

        setStatus("success");
        setMessage("Thank you! Your subscription is active.");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please check your account or contact support.");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (status !== "success") return;
    const t = window.setTimeout(() => {
      router.push(REDIRECT_TO);
    }, REDIRECT_MS);
    return () => window.clearTimeout(t);
  }, [status, router]);

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <div className={styles.spinner} aria-hidden />
            <p className={styles.lead}>Confirming your payment…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={styles.check} aria-hidden>
              ✓
            </div>
            <h1 className={styles.title}>Payment successful</h1>
            <p className={styles.lead}>{message}</p>
            {plan ? (
              <p className={styles.planLine}>
                You’re on <strong>{planLabel(plan)}</strong> — enjoy full access to AI features for your tier.
              </p>
            ) : null}
            <p className={styles.redirect}>
              Taking you back to the app in a few seconds…
            </p>
            <Link href={REDIRECT_TO} className={styles.linkBtn}>
              Go to dashboard now
            </Link>
          </>
        )}

        {status === "pending" && (
          <>
            <div className={styles.pending} aria-hidden>
              …
            </div>
            <h1 className={styles.title}>Almost there</h1>
            <p className={styles.lead}>{message}</p>
            <Link href={REDIRECT_TO} className={styles.linkBtn}>
              Go to dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className={styles.title}>Couldn’t confirm checkout</h1>
            <p className={styles.lead}>{message}</p>
            <Link href={REDIRECT_TO} className={styles.linkBtn}>
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
