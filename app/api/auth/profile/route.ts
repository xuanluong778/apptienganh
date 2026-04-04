import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { ensureUserProfileColumns } from "@/lib/users/ensure-user-profile-columns";

const COOKIE_NAME = "session_token";

function parseDob(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "__invalid__";
  const d = new Date(s + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "__invalid__";
  return s;
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const [rows] = await pool.query(
      `SELECT u.id FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1`,
      [token]
    );
    const user = (rows as { id: number }[])[0];
    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired." }, { status: 401 });
    }

    let body: { date_of_birth?: string | null };
    try {
      body = (await request.json()) as { date_of_birth?: string | null };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
    }

    await ensureUserProfileColumns();

    if ("date_of_birth" in body) {
      const dob = parseDob(body.date_of_birth);
      if (dob === "__invalid__") {
        return NextResponse.json(
          { success: false, message: "Ngày sinh cần định dạng YYYY-MM-DD." },
          { status: 400 }
        );
      }
      await pool.query(`UPDATE users SET date_of_birth = ? WHERE id = ?`, [dob, user.id]);
    }

    const [out] = await pool.query(
      `SELECT id, name, email, phone, avatar_url, date_of_birth FROM users WHERE id = ? LIMIT 1`,
      [user.id]
    );
    return NextResponse.json({ success: true, data: (out as object[])[0] || null });
  } catch (err) {
    console.error("[auth/profile] PATCH", err);
    return NextResponse.json({ success: false, message: "Could not update profile." }, { status: 500 });
  }
}
