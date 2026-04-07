import { SePayPgClient } from "sepay-pg-node";

export function createSePayClient(): SePayPgClient | null {
  const merchant_id = process.env.SEPAY_MERCHANT_ID?.trim();
  const secret_key = process.env.SEPAY_SECRET_KEY?.trim();
  if (!merchant_id || !secret_key) return null;
  const env = process.env.SEPAY_ENV === "production" ? "production" : "sandbox";
  return new SePayPgClient({ env, merchant_id, secret_key });
}

export function getSePayWebhookSecret(): string {
  return process.env.SEPAY_WEBHOOK_SECRET?.trim() || "";
}
