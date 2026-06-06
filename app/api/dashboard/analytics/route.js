import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensureUserStatsTables } from "@/lib/srs/ensure-stats";

export const dynamic = "force-dynamic";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await ensureUserStatsTables();

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS d,
              COUNT(*) AS total_answers,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_answers
       FROM user_events
       WHERE user_id = ?
         AND event_type = 'quiz_answer'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       GROUP BY DATE(created_at)
       ORDER BY d ASC`,
      [userId]
    );

    const map = new Map();
    for (const r of rows || []) {
      const key = String(r.d || "").slice(0, 10);
      const total = Number(r.total_answers || 0);
      const correct = Number(r.correct_answers || 0);
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
      map.set(key, { total_answers: total, correct_rate: rate });
    }

    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = isoDate(d);
      const hit = map.get(key) || { total_answers: 0, correct_rate: 0 };
      out.push({ date: key, ...hit });
    }

    return NextResponse.json({ success: true, data: out });
  } catch (_error) {
    return NextResponse.json({ success: false, message: "Failed to load analytics." }, { status: 500 });
  }
}

