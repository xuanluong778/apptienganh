import pool from "@/lib/db";

export type BillingConversionEventType =
  | "paywall_shown"
  | "upgrade_clicked"
  | "checkout_started"
  | "payment_success";

const CLIENT_ALLOWED: ReadonlySet<string> = new Set(["paywall_shown", "upgrade_clicked"]);

let tableReady = false;

async function ensureBillingConversionTable(): Promise<void> {
  if (tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS billing_conversion_events (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      event_type VARCHAR(32) NOT NULL,
      metadata JSON NULL,
      stripe_checkout_session_id VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_event_time (user_id, event_type, created_at),
      KEY idx_event_time (event_type, created_at),
      KEY idx_stripe_session (stripe_checkout_session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  tableReady = true;
}

function safeJson(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta || typeof meta !== "object") return null;
  if (Object.keys(meta).length === 0) return null;
  try {
    return JSON.stringify(meta);
  } catch {
    return null;
  }
}

/**
 * Persist a billing funnel event (best-effort; never throws to callers).
 */
export async function logBillingConversionEvent(params: {
  userId: number | null;
  event: BillingConversionEventType;
  metadata?: Record<string, unknown> | null;
  stripeCheckoutSessionId?: string | null;
}): Promise<void> {
  try {
    await ensureBillingConversionTable();
    const sid = params.stripeCheckoutSessionId
      ? String(params.stripeCheckoutSessionId).slice(0, 255)
      : null;
    await pool.query(
      `INSERT INTO billing_conversion_events (user_id, event_type, metadata, stripe_checkout_session_id)
       VALUES (?, ?, ?, ?)`,
      [
        params.userId,
        params.event,
        safeJson(params.metadata ?? null),
        sid,
      ]
    );
  } catch (err) {
    console.error("[billing/conversion]", params.event, err);
  }
}

export function isClientBillableEvent(event: string): event is "paywall_shown" | "upgrade_clicked" {
  return CLIENT_ALLOWED.has(event);
}

/**
 * Avoid duplicate payment_success rows for the same Checkout Session (e.g. refresh).
 */
export async function logPaymentSuccessOnce(params: {
  userId: number;
  stripeCheckoutSessionId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await ensureBillingConversionTable();
    const sid = String(params.stripeCheckoutSessionId).slice(0, 255);
    const [existing] = await pool.query(
      `SELECT id FROM billing_conversion_events
       WHERE event_type = 'payment_success' AND stripe_checkout_session_id = ?
       LIMIT 1`,
      [sid]
    );
    if (Array.isArray(existing) && existing.length > 0) return;

    await pool.query(
      `INSERT INTO billing_conversion_events (user_id, event_type, metadata, stripe_checkout_session_id)
       VALUES (?, 'payment_success', ?, ?)`,
      [params.userId, safeJson(params.metadata ?? null), sid]
    );
  } catch (err) {
    console.error("[billing/conversion] payment_success", err);
  }
}
