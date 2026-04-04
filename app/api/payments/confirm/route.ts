import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensurePaymentsTable } from "@/lib/payments/ensure-payments-table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: number;
  user_id: number;
  status: string;
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in required." },
        { status: 401 }
      );
    }

    let body: { transferContent?: string };
    try {
      body = (await request.json()) as { transferContent?: string };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const transferContent = String(body.transferContent || "").trim();
    if (!transferContent) {
      return NextResponse.json(
        { success: false, message: "transferContent is required." },
        { status: 400 }
      );
    }

    await ensurePaymentsTable();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `SELECT id, user_id, status
         FROM payments
         WHERE transfer_content = ?
         LIMIT 1
         FOR UPDATE`,
        [transferContent]
      );

      const payment = (rows as PaymentRow[])[0];
      if (!payment) {
        await conn.rollback();
        return NextResponse.json(
          { success: false, message: "Payment not found." },
          { status: 404 }
        );
      }

      if (Number(payment.user_id) !== Number(userId)) {
        await conn.rollback();
        return NextResponse.json(
          { success: false, message: "This payment does not belong to your account." },
          { status: 403 }
        );
      }

      if (payment.status === "admin_confirmed") {
        await conn.commit();
        return NextResponse.json({
          success: true,
          data: { status: "admin_confirmed", message: "Already approved by admin." },
        });
      }

      if (payment.status === "user_confirmed") {
        await conn.commit();
        return NextResponse.json({
          success: true,
          data: { status: "user_confirmed", message: "Already marked as transferred." },
        });
      }

      await conn.query(
        `UPDATE payments
         SET status = 'user_confirmed', updated_at = NOW()
         WHERE id = ?`,
        [payment.id]
      );

      await conn.commit();
      return NextResponse.json({
        success: true,
        data: {
          status: "user_confirmed",
          message: "Đã gửi yêu cầu, vui lòng chờ admin xác nhận.",
        },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[payments/confirm]", err);
    return NextResponse.json(
      { success: false, message: "Could not mark payment as transferred." },
      { status: 500 }
    );
  }
}