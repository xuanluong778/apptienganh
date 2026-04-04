import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensurePaymentsTable } from "@/lib/payments/ensure-payments-table";
import {
  amountVndForPlan,
  normalizeBillingPeriod,
  type BillingPeriod,
} from "@/lib/billing/plan-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "pro" | "vip";

const BANK_ACCOUNT = "195232659";
const BANK_NAME = "ACB";
const ACCOUNT_NAME = "Luu Xuan Luong";

function generateTransferContent(userId: number): string {
  const random = crypto.randomBytes(4).toString("hex"); // 8-char random
  return `APP_${userId}_${random}`;
}

export async function POST(request: NextRequest) {
  try {
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

    await ensurePaymentsTable();

    const amount = amountVndForPlan(plan, billingPeriod);
    let transferContent = "";
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      transferContent = generateTransferContent(userId);
      try {
        await pool.query(
          `INSERT INTO payments (user_id, amount, plan, billing_period, transfer_content, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [userId, amount, plan, billingPeriod, transferContent]
        );
        inserted = true;
      } catch (err: unknown) {
        const code = (err as { code?: string; errno?: number }).code || (err as { errno?: number }).errno;
        if (code === "ER_DUP_ENTRY" || code === 1062) {
          continue;
        }
        throw err;
      }
    }
    if (!inserted || !transferContent) {
      return NextResponse.json(
        { success: false, message: "Could not generate unique transfer reference." },
        { status: 500 }
      );
    }

    const encodedInfo = encodeURIComponent(transferContent);
    const qrUrl = `https://img.vietqr.io/image/ACB-195232659-compact.png?amount=${amount}&addInfo=${encodedInfo}&accountName=${encodeURIComponent(
      ACCOUNT_NAME
    )}`;

    return NextResponse.json({
      success: true,
      data: {
        amount,
        plan,
        billingPeriod,
        bankAccount: BANK_ACCOUNT,
        bankName: BANK_NAME,
        accountName: ACCOUNT_NAME,
        transferContent,
        qrUrl,
      },
    });
  } catch (err) {
    console.error("[payments/create]", err);
    return NextResponse.json(
      { success: false, message: "Could not create payment." },
      { status: 500 }
    );
  }
}

