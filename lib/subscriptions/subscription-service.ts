import type { PoolConnection } from "mysql2/promise";
import pool from "@/lib/db";

export type SubscriptionPlan = "free" | "pro" | "vip";
export type UserPlanState = "trial" | "pro" | "vip" | "expired";

export type SubscriptionRow = {
  id: number;
  user_id: number;
  plan: SubscriptionPlan;
  trial_start_at: Date;
  trial_end_at: Date;
  subscribed_at: Date | null;
  expires_at: Date | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  created_at: Date;
  updated_at: Date;
};

/** Pooled AI calls/day (chat + translate + grammar). PRO “300k/mo” ≈ budget; enforced here by daily cap. */
export const TRIAL_AND_FREE_DAILY_LIMIT = 20;
export const PRO_DAILY_LIMIT = 200;
export const VIP_EFFECTIVELY_UNLIMITED = 50_000;

let schemaReady = false;

async function ensureStripeSchemaPatches(): Promise<void> {
  try {
    await pool.query(`ALTER TABLE subscriptions ADD COLUMN stripe_customer_id VARCHAR(255) NULL`);
  } catch {
    /* exists */
  }
  try {
    await pool.query(`ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id VARCHAR(255) NULL`);
  } catch {
    /* exists */
  }
  try {
    await pool.query(
      `ALTER TABLE subscriptions ADD UNIQUE KEY uk_stripe_subscription (stripe_subscription_id)`
    );
  } catch {
    /* exists */
  }
  await pool.query(
    `CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id VARCHAR(255) NOT NULL PRIMARY KEY,
      event_type VARCHAR(80) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_event_type (event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function ensureSubscriptionTables(): Promise<void> {
  if (schemaReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      plan ENUM('free', 'pro', 'vip') NOT NULL DEFAULT 'free',
      trial_start_at DATETIME NOT NULL,
      trial_end_at DATETIME NOT NULL,
      subscribed_at DATETIME NULL,
      expires_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_subscriptions_user (user_id),
      KEY idx_subscriptions_expires (expires_at),
      KEY idx_subscriptions_trial_end (trial_end_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ai_usage_daily (
      user_id BIGINT UNSIGNED NOT NULL,
      usage_date DATE NOT NULL,
      request_count INT UNSIGNED NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, usage_date),
      KEY idx_usage_date (usage_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await ensureStripeSchemaPatches();
  schemaReady = true;
}

function asDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isTrialActive(row: SubscriptionRow | null | undefined): boolean {
  if (!row?.trial_end_at) return false;
  const end = asDate(row.trial_end_at);
  if (!end) return false;
  return Date.now() < end.getTime();
}

export function isSubscriptionActive(row: SubscriptionRow | null | undefined): boolean {
  if (!row?.expires_at) return false;
  const end = asDate(row.expires_at);
  if (!end) return false;
  return Date.now() < end.getTime();
}

/**
 * Paid subscription takes precedence over trial.
 * - Active paid pro/vip → plan name
 * - Else active trial → "trial"
 * - Else → "expired"
 */
export function getUserPlan(row: SubscriptionRow | null | undefined): UserPlanState {
  if (!row) return "expired";
  if (isSubscriptionActive(row)) {
    if (row.plan === "vip") return "vip";
    if (row.plan === "pro") return "pro";
  }
  if (isTrialActive(row)) return "trial";
  return "expired";
}

export function canAccessPaidAi(row: SubscriptionRow | null | undefined): boolean {
  return getUserPlan(row) !== "expired";
}

/**
 * Whole days left in an active trial (`null` if user is not on an active trial).
 * Uses wall-clock difference vs `trial_end_at` (same idea as billing).
 */
export function getTrialDaysRemaining(row: SubscriptionRow | null | undefined): number | null {
  if (!row || getUserPlan(row) !== "trial" || !isTrialActive(row)) return null;
  const end = asDate(row.trial_end_at);
  if (!end) return null;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Pooled daily cap for chat / translate / grammar. */
export function getPooledDailyLimit(planState: UserPlanState): number {
  switch (planState) {
    case "vip":
      return VIP_EFFECTIVELY_UNLIMITED;
    case "pro":
      return PRO_DAILY_LIMIT;
    case "trial":
      return TRIAL_AND_FREE_DAILY_LIMIT;
    default:
      return 0;
  }
}

/** Azure / “speaking AI” — paid VIP with active subscription only (not trial). */
export function canUseSpeakingAi(row: SubscriptionRow | null | undefined): boolean {
  if (!row) return false;
  return row.plan === "vip" && isSubscriptionActive(row);
}

export async function fetchSubscriptionRow(userId: number): Promise<SubscriptionRow | null> {
  await ensureSubscriptionTables();
  const [rows] = await pool.query(
    `SELECT id, user_id, plan, trial_start_at, trial_end_at, subscribed_at, expires_at,
            stripe_customer_id, stripe_subscription_id, created_at, updated_at
     FROM subscriptions WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  const r = (rows as SubscriptionRow[])[0];
  return r ?? null;
}

/** Idempotent default row: free + 15-day trial from first insert. */
export async function ensureSubscriptionRow(userId: number): Promise<SubscriptionRow> {
  await ensureSubscriptionTables();
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, trial_start_at, trial_end_at)
     VALUES (?, 'free', NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY))
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId]
  );
  const row = await fetchSubscriptionRow(userId);
  if (!row) throw new Error("subscriptions: insert failed");
  return row;
}

export async function createInitialSubscriptionForNewUser(userId: number): Promise<void> {
  await ensureSubscriptionRow(userId);
}

export type SubscriptionWithUsage = {
  subscription: SubscriptionRow;
  usageToday: number;
};

/** Single round-trip: row + today’s pooled usage. */
export async function loadSubscriptionAndUsageToday(
  userId: number
): Promise<SubscriptionWithUsage | null> {
  await ensureSubscriptionTables();
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, trial_start_at, trial_end_at)
     VALUES (?, 'free', NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY))
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId]
  );
  const [rows] = await pool.query(
    `SELECT s.id, s.user_id, s.plan, s.trial_start_at, s.trial_end_at, s.subscribed_at, s.expires_at,
            s.stripe_customer_id, s.stripe_subscription_id,
            s.created_at, s.updated_at,
            COALESCE(u.request_count, 0) AS usage_today
     FROM subscriptions s
     LEFT JOIN ai_usage_daily u ON u.user_id = s.user_id AND u.usage_date = CURDATE()
     WHERE s.user_id = ?
     LIMIT 1`,
    [userId]
  );
  const raw = (rows as Record<string, unknown>[])[0];
  if (!raw) return null;
  const usageToday = Number(raw.usage_today ?? 0);
  const subscription: SubscriptionRow = {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    plan: raw.plan as SubscriptionPlan,
    trial_start_at: raw.trial_start_at as Date,
    trial_end_at: raw.trial_end_at as Date,
    subscribed_at: asDate(raw.subscribed_at),
    expires_at: asDate(raw.expires_at),
    stripe_customer_id: raw.stripe_customer_id != null ? String(raw.stripe_customer_id) : null,
    stripe_subscription_id: raw.stripe_subscription_id != null ? String(raw.stripe_subscription_id) : null,
    created_at: raw.created_at as Date,
    updated_at: raw.updated_at as Date,
  };
  return { subscription, usageToday };
}

/** After a successful AI response for pooled features. */
export async function incrementPooledAiUsage(userId: number): Promise<void> {
  await ensureSubscriptionTables();
  await pool.query(
    `INSERT INTO ai_usage_daily (user_id, usage_date, request_count)
     VALUES (?, CURDATE(), 1)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
    [userId]
  );
}

export async function upgradeUserPlan(userId: number, plan: "pro" | "vip"): Promise<SubscriptionRow> {
  await ensureSubscriptionTables();
  await ensureSubscriptionRow(userId);
  await pool.query(
    `UPDATE subscriptions SET
       plan = ?,
       subscribed_at = NOW(),
       expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
       updated_at = NOW()
     WHERE user_id = ?`,
    [plan, userId]
  );
  const row = await fetchSubscriptionRow(userId);
  if (!row) throw new Error("subscriptions: upgrade readback failed");
  return row;
}

/** Bank transfer (admin-confirmed): set expiry by billing period (monthly / yearly). */
export async function upgradeUserPlanFromBankTransfer(
  userId: number,
  plan: "pro" | "vip",
  billingPeriod: "monthly" | "yearly"
): Promise<SubscriptionRow> {
  await ensureSubscriptionTables();
  await ensureSubscriptionRow(userId);
  const days = billingPeriod === "yearly" ? 365 : 30;
  await pool.query(
    `UPDATE subscriptions SET
       plan = ?,
       subscribed_at = NOW(),
       expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
       updated_at = NOW()
     WHERE user_id = ?`,
    [plan, days, userId]
  );
  const row = await fetchSubscriptionRow(userId);
  if (!row) throw new Error("subscriptions: bank upgrade readback failed");
  return row;
}

/** Cùng transaction MySQL với bảng `payments` (IPN SePay, v.v.). */
export async function upgradeUserPlanFromBankTransferOnConn(
  conn: PoolConnection,
  userId: number,
  plan: "pro" | "vip",
  billingPeriod: "monthly" | "yearly"
): Promise<void> {
  const days = billingPeriod === "yearly" ? 365 : 30;
  await conn.query(
    `UPDATE subscriptions SET
       plan = ?,
       subscribed_at = NOW(),
       expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
       updated_at = NOW()
     WHERE user_id = ?`,
    [plan, days, userId]
  );
}

/**
 * Idempotent Stripe success path: set plan, billing period end, Stripe ids.
 * Labels: pro (300k/mo), vip (500k/mo) — quotas remain in app logic / env docs.
 */
export async function applyStripePaidPlan(params: {
  userId: number;
  plan: "pro" | "vip";
  /** Stripe `current_period_end` (seconds). */
  periodEnd: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
}): Promise<void> {
  await ensureSubscriptionTables();
  await ensureSubscriptionRow(params.userId);
  await pool.query(
    `UPDATE subscriptions SET
       plan = ?,
       subscribed_at = COALESCE(subscribed_at, NOW()),
       expires_at = ?,
       stripe_customer_id = COALESCE(?, stripe_customer_id),
       stripe_subscription_id = ?,
       updated_at = NOW()
     WHERE user_id = ?`,
    [
      params.plan,
      params.periodEnd,
      params.stripeCustomerId,
      params.stripeSubscriptionId,
      params.userId,
    ]
  );
}

/** After Stripe subscription ends (cancelled / unpaid after retries). */
export async function downgradeAfterStripeSubscriptionEnded(userId: number): Promise<void> {
  await ensureSubscriptionTables();
  await pool.query(
    `UPDATE subscriptions SET
       plan = 'free',
       expires_at = NULL,
       stripe_subscription_id = NULL,
       updated_at = NOW()
     WHERE user_id = ?`,
    [userId]
  );
}

export async function findUserIdByStripeSubscriptionId(
  stripeSubscriptionId: string
): Promise<number | null> {
  await ensureSubscriptionTables();
  const [rows] = await pool.query(
    `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1`,
    [stripeSubscriptionId]
  );
  const id = Number((rows as { user_id: number }[])[0]?.user_id);
  return Number.isFinite(id) ? id : null;
}

/**
 * Claim a webhook event for processing (`INSERT IGNORE`). Returns false if already processed.
 * On handler failure, call `releaseStripeWebhookEvent` so Stripe retries can re-run.
 */
export async function claimStripeWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  await ensureSubscriptionTables();
  const [res] = await pool.query(
    `INSERT IGNORE INTO stripe_webhook_events (event_id, event_type) VALUES (?, ?)`,
    [eventId, eventType.slice(0, 80)]
  );
  const affected = (res as { affectedRows?: number }).affectedRows ?? 0;
  return affected === 1;
}

export async function releaseStripeWebhookEvent(eventId: string): Promise<void> {
  await ensureSubscriptionTables();
  await pool.query(`DELETE FROM stripe_webhook_events WHERE event_id = ?`, [eventId]);
}

export async function isTrialActiveForUserId(userId: number): Promise<boolean> {
  const row = await ensureSubscriptionRow(userId);
  return isTrialActive(row);
}

export async function isSubscriptionActiveForUserId(userId: number): Promise<boolean> {
  const row = await fetchSubscriptionRow(userId);
  return isSubscriptionActive(row);
}

export async function getUserPlanForUserId(userId: number): Promise<UserPlanState> {
  const row = await ensureSubscriptionRow(userId);
  return getUserPlan(row);
}
