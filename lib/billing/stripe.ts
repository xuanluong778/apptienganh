import Stripe from "stripe";
import { getSettingSync } from "@/lib/runtime-settings/cache";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = getSettingSync("STRIPE_SECRET_KEY")?.trim();
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function getStripeWebhookSecret(): string {
  const s = getSettingSync("STRIPE_WEBHOOK_SECRET")?.trim();
  if (!s) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return s;
}

export function resolvePlanFromStripePriceId(priceId: string | undefined): "pro" | "vip" | null {
  if (!priceId) return null;
  const pro = getSettingSync("STRIPE_PRICE_PRO")?.trim();
  const vip = getSettingSync("STRIPE_PRICE_VIP")?.trim();
  const proY = getSettingSync("STRIPE_PRICE_PRO_YEARLY")?.trim();
  const vipY = getSettingSync("STRIPE_PRICE_VIP_YEARLY")?.trim();
  if (pro && priceId === pro) return "pro";
  if (vip && priceId === vip) return "vip";
  if (proY && priceId === proY) return "pro";
  if (vipY && priceId === vipY) return "vip";
  return null;
}
