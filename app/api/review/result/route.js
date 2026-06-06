import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureUserWordProgressTable } from "@/lib/srs/ensure-schema";
import { ensureUserStatsTables } from "@/lib/srs/ensure-stats";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { updateSRS } from "@/lib/srs/update-srs";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let conn;
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const wordId = Number(body?.word_id);
    const isCorrect = Boolean(body?.isCorrect);
    const attemptId = typeof body?.attempt_id === "string" ? body.attempt_id.trim() : "";

    if (!Number.isFinite(wordId) || wordId <= 0) {
      return NextResponse.json({ success: false, message: "word_id is required." }, { status: 400 });
    }

    await ensureUserWordProgressTable();
    await ensureUserStatsTables();

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Idempotency: if this attempt_id was already processed for this user, return current state.
    if (attemptId) {
      const [evtRows] = await conn.query(
        `SELECT id, xp_delta FROM user_review_events WHERE user_id = ? AND attempt_id = ? LIMIT 1 FOR UPDATE`,
        [userId, attemptId]
      );
      if (evtRows && evtRows[0]) {
        const [pRows] = await conn.query(
          `SELECT user_id, word_id, mastery_level, last_reviewed_at, next_review_at, correct_streak, wrong_count
           FROM user_word_progress
           WHERE user_id = ? AND word_id = ?
           LIMIT 1`,
          [userId, wordId]
        );
        const [sRows] = await conn.query(
          `SELECT user_id, xp_total, current_streak, best_streak, last_active_date, last_answer_at
           FROM user_stats
           WHERE user_id = ?
           LIMIT 1`,
          [userId]
        );
        await conn.commit();
        return NextResponse.json({
          success: true,
          data: {
            user_id: userId,
            word_id: wordId,
            progress: pRows?.[0] || null,
            stats: sRows?.[0]
              ? {
                  xp_delta: Number(evtRows[0]?.xp_delta || 0),
                  xp_total: Number(sRows[0]?.xp_total || 0),
                  current_streak: Number(sRows[0]?.current_streak || 0),
                  level: Math.floor(Number(sRows[0]?.xp_total || 0) / 100),
                }
              : null,
            idempotent: true,
          },
        });
      }
    }

    const [rows] = await conn.query(
      `SELECT user_id, word_id, mastery_level, last_reviewed_at, next_review_at, correct_streak, wrong_count
       FROM user_word_progress
       WHERE user_id = ? AND word_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId, wordId]
    );
    const progress = (rows && rows[0]) || {
      mastery_level: 0,
      correct_streak: 0,
      wrong_count: 0,
    };

    const next = updateSRS(progress, isCorrect);

    // Upsert progress row
    await conn.query(
      `INSERT INTO user_word_progress
        (user_id, word_id, mastery_level, last_reviewed_at, next_review_at, correct_streak, wrong_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        mastery_level = VALUES(mastery_level),
        last_reviewed_at = VALUES(last_reviewed_at),
        next_review_at = VALUES(next_review_at),
        correct_streak = VALUES(correct_streak),
        wrong_count = VALUES(wrong_count),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        wordId,
        next.mastery_level,
        next.last_reviewed_at,
        next.next_review_at,
        next.correct_streak,
        next.wrong_count,
      ]
    );

    // XP + streak update (minimal, deterministic):
    // - correct: +10 XP, streak +1
    // - wrong: +0 XP, streak reset to 0
    const xpDelta = isCorrect ? 10 : 0;
    await conn.query(`INSERT INTO user_stats (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`, [
      userId,
    ]);
    // Daily streak based on last_active_date:
    // - yesterday → +1
    // - today → no change
    // - else → reset = 1
    await conn.query(
      `UPDATE user_stats
       SET xp_total = xp_total + ?,
           current_streak = CASE
             WHEN last_active_date = CURDATE() THEN current_streak
             WHEN last_active_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN current_streak + 1
             ELSE 1
           END,
           best_streak = GREATEST(
             best_streak,
             CASE
               WHEN last_active_date = CURDATE() THEN current_streak
               WHEN last_active_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN current_streak + 1
               ELSE 1
             END
           ),
           last_active_date = CURDATE(),
           last_answer_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [xpDelta, userId]
    );

    const [sRows2] = await conn.query(
      `SELECT xp_total, current_streak FROM user_stats WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    const xpTotal = Number(sRows2?.[0]?.xp_total || 0);
    const nextStreak = Number(sRows2?.[0]?.current_streak || 0);
    const level = Math.floor(xpTotal / 100);

    // Log event for idempotency (after all mutations are ready).
    if (attemptId) {
      await conn.query(
        `INSERT INTO user_review_events (user_id, attempt_id, word_id, is_correct, xp_delta)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, attemptId, wordId, isCorrect ? 1 : 0, xpDelta]
      );
    }

    // Analytics event log (idempotent via unique key).
    // Using INSERT IGNORE to avoid breaking UX on retries.
    try {
      await conn.query(
        `INSERT IGNORE INTO user_events (user_id, attempt_id, event_type, word_id, is_correct)
         VALUES (?, ?, 'quiz_answer', ?, ?)`,
        [userId, attemptId || null, wordId, isCorrect ? 1 : 0]
      );
    } catch (_e) {
      /* analytics is optional */
    }

    await conn.commit();
    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        word_id: wordId,
        progress: {
          mastery_level: next.mastery_level,
          correct_streak: next.correct_streak,
          wrong_count: next.wrong_count,
          last_reviewed_at: next.last_reviewed_at,
          next_review_at: next.next_review_at,
        },
        stats: {
          xp_delta: xpDelta,
          xp_total: xpTotal,
          current_streak: nextStreak,
          level,
        },
      },
    });
  } catch (error) {
    try {
      await conn?.rollback?.();
    } catch (_e) {}
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      { success: false, message: `Failed to update review result.${detail}`.trim() },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release?.();
    } catch (_e) {}
  }
}

