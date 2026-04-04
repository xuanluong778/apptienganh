import { NextResponse } from "next/server";
import pool from "@/lib/db";

const COOKIE_NAME = "session_token";

async function requireAuthenticatedUser(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export async function GET(request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS lesson_chat_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'text',
        message TEXT NOT NULL,
        ai_reply TEXT NOT NULL,
        spoken_text TEXT NULL,
        pronunciation_score INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         COUNT(DISTINCT p.lesson_id) AS lesson_count,
         COUNT(DISTINCT p.lesson_id) AS vocabulary_learned,
         SUM(CASE WHEN p.completed_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_count,
         ROUND(AVG(CASE WHEN p.score IS NOT NULL THEN p.score END), 0) AS avg_lesson_score,
         SUM(CASE WHEN lcl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS chat_7d,
         SUM(CASE WHEN lcl.source = 'voice' AND lcl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS voice_7d,
         ROUND(AVG(CASE WHEN lcl.pronunciation_score IS NOT NULL THEN lcl.pronunciation_score END), 0) AS avg_pronunciation
       FROM users u
       LEFT JOIN progress p ON p.user_id = u.id
       LEFT JOIN lesson_chat_logs lcl ON lcl.user_id = u.id
       GROUP BY u.id, u.name, u.email
       ORDER BY u.created_at DESC
       LIMIT 200`
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch students progress list." },
      { status: 500 }
    );
  }
}
