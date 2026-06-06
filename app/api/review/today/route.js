import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import { buildVocabularySelectFragments, getVocabularyTableColumnSet } from "@/lib/vocabulary/vocabulary-columns";
import { ensureUserWordProgressTable } from "@/lib/srs/ensure-schema";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await ensureVocabularySchema(pool);
    await ensureUserWordProgressTable();

    const cols = await getVocabularyTableColumnSet();
    const { selectList } = buildVocabularySelectFragments(cols);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 60)));

    const [rows] = await pool.query(
      `SELECT ${selectList}, p.mastery_level, p.last_reviewed_at, p.next_review_at, p.correct_streak, p.wrong_count
       FROM user_word_progress p
       INNER JOIN vocabulary v ON v.id = p.word_id
       WHERE p.user_id = ?
         AND p.next_review_at IS NOT NULL
         AND p.next_review_at <= NOW()
       ORDER BY p.next_review_at ASC
       LIMIT ?`,
      [userId, limit]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      { success: false, message: `Failed to load today's review items.${detail}`.trim() },
      { status: 500 }
    );
  }
}

