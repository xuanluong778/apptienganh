import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensurePaymentsTable } from "@/lib/payments/ensure-payments-table";
import { createSePayClient } from "@/lib/billing/sepay-client";
import { resolvePublicBaseUrl } from "@/lib/billing/resolve-public-base-url";
import {
  amountVndForPlan,
  normalizeBillingPeriod,
  type BillingPeriod,
} from "@/lib/billing/plan-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "pro" | "vip";

function generateInvoiceNumber(userId: number): string {
  const rand = crypto.randomBytes(4).toString("hex");
  return `SEPAY_U${userId}_T${Date.now().toString(36)}_${rand}`.slice(0, 120);
}

export async function POST(request: NextRequest) {
  try {
    const client = createSePayClient();
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          code: "SEPAY_NOT_CONFIGURED",
          message: "Thanh toán SePay chưa cấu hình (thiếu SEPAY_MERCHANT_ID / SEPAY_SECRET_KEY).",
        },
        { status: 503 }
      );
    }

    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in required." },
        { status: 401 }
      );
    }

    let body: { plan?: string; billing_period?: string };
    try {
      body = (await request.json()) as { plan?: string; billing_period?: string };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const planRaw = String(body.plan || "").toLowerCase();
    if (planRaw !== "pro" && planRaw !== "vip") {
      return NextResponse.json(
        { success: false, message: 'plan must be "pro" or "vip".' },
        { status: 400 }
      );
    }
    const plan = planRaw as Plan;
    const billingPeriod: BillingPeriod = normalizeBillingPeriod(body.billing_period);
    const amount = amountVndForPlan(plan, billingPeriod);

    const base = resolvePublicBaseUrl(request);
    if (!base) {
      return NextResponse.json(
        { success: false, message: "Không xác định được URL public (NEXT_PUBLIC_APP_URL hoặc Host)." },
        { status: 500 }
      );
    }

    await ensurePaymentsTable();

    let transferContent = "";
    let inserted = false;
    for (let attempt = 0; attempt < 8 && !inserted; attempt += 1) {
      transferContent = generateInvoiceNumber(userId);
      try {
        await pool.query(
          `INSERT INTO payments (user_id, amount, plan, billing_period, transfer_content, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [userId, amount, plan, billingPeriod, transferContent]
        );
        inserted = true;
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === "ER_DUP_ENTRY" || code === "1062") continue;
        throw err;
      }
    }
    if (!inserted || !transferContent) {
      return NextResponse.json(
        { success: false, message: "Could not create unique payment reference." },
        { status: 500 }
      );
    }

    const successUrl = `${base}/billing/sepay/return?outcome=success`;
    const errorUrl = `${base}/billing/sepay/return?outcome=error`;
    const cancelUrl = `${base}/billing/sepay/return?outcome=cancel`;

    const fields = client.checkout.initOneTimePaymentFields({
      operation: "PURCHASE",
      payment_method: "BANK_TRANSFER",
      order_invoice_number: transferContent,
      order_amount: amount,
      currency: "VND",
      order_description: `Apptienganh · ${plan.toUpperCase()} · ${billingPeriod === "yearly" ? "12 tháng" : "1 tháng"}`,
      customer_id: String(userId),
      success_url: successUrl,
      error_url: errorUrl,
      cancel_url: cancelUrl,
    });

    const actionUrl = client.checkout.initCheckoutUrl();

    const plain: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      plain[k] = typeof v === "number" ? String(v) : String(v);
    }

    return NextResponse.json({
      success: true,
      data: {
        mode: "sepay",
        actionUrl,
        fields: plain,
        amount,
        plan,
        billingPeriod,
        orderInvoiceNumber: transferContent,
      },
    });
  } catch (err) {
    console.error("[payments/sepay/init]", err);
    return NextResponse.json(
      { success: false, message: "Could not start SePay checkout." },
      { status: 500 }
    );
  }
}
