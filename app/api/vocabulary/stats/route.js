import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import { ensureUserWordProgressTable } from "@/lib/srs/ensure-schema";
import { ensureUserStatsTables } from "@/lib/srs/ensure-stats";

export const dynamic = "force-dynamic";

const GUEST_STATS = {
  authenticated: false,
  learned_today: 0,
  review_due: 0,
  new_today: 0,
  pronunciation_practiced: 0,
  progress_percent: 0,
  streak_days: 0,
  total_learning: 0,
};

export async function GET(request) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: true, data: GUEST_STATS });
    }

    await ensureVocabularySchema(pool);
    await ensureUserWordProgressTable();
    await ensureUserStatsTables();

    const [[learnedTodayRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM user_word_progress
       WHERE user_id = ? AND last_reviewed_at IS NOT NULL AND DATE(last_reviewed_at) = CURDATE()`,
      [userId]
    );

    const [[reviewDueRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM user_word_progress
       WHERE user_id = ? AND next_review_at IS NOT NULL AND next_review_at <= NOW()`,
      [userId]
    );

    const [[newTodayRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM user_word_progress
       WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      [userId]
    );

    const [[totalLearningRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM user_word_progress WHERE user_id = ?`,
      [userId]
    );

    const [[masteredRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM user_word_progress WHERE user_id = ? AND mastery_level >= 4`,
      [userId]
    );

    const [[statsRow]] = await pool.query(
      `SELECT current_streak FROM user_stats WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    let pronunciationPracticed = 0;
    try {
      const [[pronRow]] = await pool.query(
        `SELECT COUNT(*) AS c FROM user_events
         WHERE user_id = ? AND event_type = 'pronunciation_practice' AND DATE(created_at) = CURDATE()`,
        [userId]
      );
      pronunciationPracticed = Number(pronRow?.c || 0);
    } catch {
      pronunciationPracticed = Number(learnedTodayRow?.c || 0);
    }

    const totalLearning = Number(totalLearningRow?.c || 0);
    const mastered = Number(masteredRow?.c || 0);
    const progressPercent =
      totalLearning > 0 ? Math.min(100, Math.round((mastered / totalLearning) * 100)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        learned_today: Number(learnedTodayRow?.c || 0),
        review_due: Number(reviewDueRow?.c || 0),
        new_today: Number(newTodayRow?.c || 0),
        pronunciation_practiced: pronunciationPracticed,
        progress_percent: progressPercent,
        streak_days: Number(statsRow?.current_streak || 0),
        total_learning: totalLearning,
      },
    });
  } catch (error) {
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      { success: false, message: `Không tải được thống kê.${detail}`.trim() },
      { status: 500 }
    );
  }
}
