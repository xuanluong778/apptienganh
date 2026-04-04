import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { ensurePaymentsTable } from "@/lib/payments/ensure-payments-table";

const ADMIN_EMAIL = "xuanluong778@gmail.com";

async function requireAdminUser(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  const user = (rows as any[])[0] || null;
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) return null;
  return user;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin access only." },
        { status: 403 }
      );
    }

    await ensurePaymentsTable();

    const { searchParams } = new URL(request.url);
    const rawQ = String(searchParams.get("q") || "").trim();
    const q = rawQ.toLowerCase();

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         u.name,
         u.email,
         p.plan,
         p.billing_period,
         p.amount,
         p.transfer_content,
         p.status,
         p.created_at,
         p.updated_at,
         p.confirmed_at
       FROM payments p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.status IN ('user_confirmed', 'admin_confirmed')
         AND (
           ? = ''
           OR LOWER(u.email) LIKE CONCAT('%', ?, '%')
           OR LOWER(u.name) LIKE CONCAT('%', ?, '%')
           OR LOWER(IFNULL(p.transfer_content, '')) LIKE CONCAT('%', ?, '%')
         )
       ORDER BY
         CASE WHEN p.status = 'user_confirmed' THEN 0 ELSE 1 END,
         p.updated_at DESC
       LIMIT 200`,
      [q, q, q, q]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin/payments] GET error", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch payments." },
      { status: 500 }
    );
  }
}