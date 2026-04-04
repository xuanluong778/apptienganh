import type { NextRequest } from "next/server";
import pool from "@/lib/db";

const DEFAULT_ADMIN_EMAIL = "xuanluong778@gmail.com";

export async function requireAdminUser(request: NextRequest): Promise<{ id: number; email: string } | null> {
  const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;

  const [rows] = await pool.query(
    `SELECT u.id, u.email
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  const user = (rows as { id: number; email: string | null }[])[0];
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  if (email !== adminEmail) return null;
  return { id: Number(user.id), email };
}
