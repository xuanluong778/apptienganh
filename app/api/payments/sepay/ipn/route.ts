import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { ensurePaymentsTable } from "@/lib/payments/ensure-payments-table";
import { getSePayWebhookSecret } from "@/lib/billing/sepay-client";
import {
  ensureSubscriptionRow,
  ensureSubscriptionTables,
  upgradeUserPlanFromBankTransferOnConn,
} from "@/lib/subscriptions/subscription-service";
import { normalizeBillingPeriod } from "@/lib/billing/plan-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headersSecretOk(headerVal: string | null, expected: string): boolean {
  const a = (headerVal || "").trim();
  const b = expected.trim();
  if (!a || !b) return false;
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

type OrderPayload = {
  order_invoice_number?: string;
  order_amount?: string | number;
  order_status?: string;
};

type IpnBody = {
  notification_type?: string;
  order?: OrderPayload;
};

function parseAmountVnd(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(String(raw || "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export async function POST(request: NextRequest) {
  const expectedSecret = getSePayWebhookSecret();
  if (!expectedSecret) {
    console.error("[payments/sepay/ipn] SEPAY_WEBHOOK_SECRET chưa cấu hình");
    return NextResponse.json({ success: false, message: "Misconfigured." }, { status: 503 });
  }

  const incomingSecret = request.headers.get("x-secret-key") || request.headers.get("X-Secret-Key");
  if (!headersSecretOk(incomingSecret, expectedSecret)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: IpnBody;
  try {
    body = (await request.json()) as IpnBody;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }

  if (body.notification_type !== "ORDER_PAID") {
    return NextResponse.json({ success: true, message: "Ignored." }, { status: 200 });
  }

  const invoice = String(body.order?.order_invoice_number || "").trim();
  const ipnAmount = parseAmountVnd(body.order?.order_amount);
  if (!invoice || !Number.isFinite(ipnAmount)) {
    return NextResponse.json({ success: true, message: "No invoice." }, { status: 200 });
  }

  await ensurePaymentsTable();
  await ensureSubscriptionTables();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, user_id, amount, plan, billing_period, status
       FROM payments
       WHERE transfer_content = ?
       LIMIT 1
       FOR UPDATE`,
      [invoice]
    );
    const payment = (rows as {
      id: number;
      user_id: number;
      amount: number;
      plan: string;
      billing_period: string | null;
      status: string;
    }[])[0];

    if (!payment) {
      await conn.rollback();
      console.warn("[payments/sepay/ipn] Unknown invoice", invoice);
      return NextResponse.json({ success: true, message: "Unknown order." }, { status: 200 });
    }

    if (payment.status === "confirmed" || payment.status === "admin_confirmed") {
      await conn.commit();
      return NextResponse.json({ success: true, message: "Already processed." }, { status: 200 });
    }

    if (Number(payment.amount) !== ipnAmount) {
      await conn.rollback();
      console.error("[payments/sepay/ipn] Amount mismatch", { invoice, db: payment.amount, ipn: ipnAmount });
      return NextResponse.json({ success: true, message: "Amount mismatch (logged)." }, { status: 200 });
    }

    const plan = payment.plan === "vip" ? "vip" : "pro";
    const billingPeriod = normalizeBillingPeriod(payment.billing_period);
    const uid = Number(payment.user_id);

    await ensureSubscriptionRow(uid);
    await upgradeUserPlanFromBankTransferOnConn(conn, uid, plan, billingPeriod);

    await conn.query(
      `UPDATE payments
       SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [payment.id]
    );

    await conn.commit();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    await conn.rollback();
    console.error("[payments/sepay/ipn]", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  } finally {
    conn.release();
  }
}
