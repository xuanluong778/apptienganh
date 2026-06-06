import pool from "@/lib/db";

const ADMIN_EMAIL = "xuanluong778@gmail.com";

export async function requireAdminUser(request) {
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

  const user = rows?.[0];
  if (!user || String(user.email || "").toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}
