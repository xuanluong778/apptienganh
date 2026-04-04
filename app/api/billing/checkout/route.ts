import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { getStripe } from "@/lib/billing/stripe";
import { logBillingConversionEvent } from "@/lib/billing/conversion-tracking";
import { normalizeBillingPeriod } from "@/lib/billing/plan-pricing";
import pool from "@/lib/db";
import { getSettingSync } from "@/lib/runtime-settings/cache";

export const runtime = "nodejs";

function appBaseUrl(): string {
  return (
    getSettingSync("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "") ||
    getSettingSync("APP_URL")?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function priceIdForPlan(plan: string, billingPeriod: string): string | null {
  if (billingPeriod === "yearly") {
    if (plan === "pro") return getSettingSync("STRIPE_PRICE_PRO_YEARLY")?.trim() || null;
    if (plan === "vip") return getSettingSync("STRIPE_PRICE_VIP_YEARLY")?.trim() || null;
    return null;
  }
  if (plan === "pro") return getSettingSync("STRIPE_PRICE_PRO")?.trim() || null;
  if (plan === "vip") return getSettingSync("STRIPE_PRICE_VIP")?.trim() || null;
  return null;
}

/**
 * POST /api/billing/checkout
 * Body: `{ "plan": "pro" | "vip", "billing_period"?: "monthly" | "yearly" }`
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in to continue checkout." },
        { status: 401 }
      );
    }

    let body: { plan?: string; billing_period?: string };
    try {
      body = (await request.json()) as { plan?: string; billing_period?: string };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const plan = String(body.plan || "").toLowerCase();
    if (plan !== "pro" && plan !== "vip") {
      return NextResponse.json(
        { success: false, message: 'plan must be "pro" or "vip".' },
        { status: 400 }
      );
    }

    const billingPeriod = normalizeBillingPeriod(body.billing_period);

    const priceId = priceIdForPlan(plan, billingPeriod);
    if (!priceId) {
      return NextResponse.json(
        {
          success: false,
          message:
            billingPeriod === "yearly"
              ? "Chưa cấu hình giá Stripe cho gói năm (STRIPE_PRICE_PRO_YEARLY / STRIPE_PRICE_VIP_YEARLY). Dùng thanh toán chuyển khoản hoặc thêm biến môi trường."
              : "Stripe price is not configured for this plan.",
        },
        { status: 503 }
      );
    }

    let stripe: ReturnType<typeof getStripe>;
    try {
      stripe = getStripe();
    } catch {
      return NextResponse.json(
        { success: false, message: "Stripe is not configured." },
        { status: 503 }
      );
    }

    const [rows] = await pool.query(
      `SELECT email FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const email = String((rows as { email?: string }[])[0]?.email || "").trim() || undefined;

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard?checkout=cancel`,
      client_reference_id: String(userId),
      customer_email: email,
      metadata: {
        userId: String(userId),
        plan,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId: String(userId),
          plan,
          billing_period: billingPeriod,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { success: false, message: "Could not create checkout session." },
        { status: 500 }
      );
    }

    await logBillingConversionEvent({
      userId,
      event: "checkout_started",
      metadata: { plan, billing_period: billingPeriod },
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
        sessionId: session.id,
      },
    });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { success: false, message: "Checkout failed." },
      { status: 500 }
    );
  }
}
