/** VND pricing: monthly base; yearly = 12 × monthly × (1 − discount). */

export const PRO_MONTHLY_VND = 300_000;
export const VIP_MONTHLY_VND = 500_000;
/** Yearly bill = 12 months × monthly price × this factor (0.7 = −30%). */
export const YEARLY_PRICE_FACTOR = 0.7;

export type BillingPeriod = "monthly" | "yearly";

export function amountVndForPlan(plan: "pro" | "vip", period: BillingPeriod): number {
  const monthly = plan === "pro" ? PRO_MONTHLY_VND : VIP_MONTHLY_VND;
  if (period === "monthly") return monthly;
  return Math.round(monthly * 12 * YEARLY_PRICE_FACTOR);
}

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

export function normalizeBillingPeriod(value: unknown): BillingPeriod {
  const s = String(value || "").toLowerCase();
  return s === "yearly" ? "yearly" : "monthly";
}
