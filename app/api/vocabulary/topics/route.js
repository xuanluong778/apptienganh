import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import {
  clearVocabularyTableColumnCache,
  getVocabularyTableColumnSet,
} from "@/lib/vocabulary/vocabulary-columns";

export const dynamic = "force-dynamic";

function isMissingVocabularyTable(error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const msg = error && typeof error === "object" && "sqlMessage" in error ? String(error.sqlMessage) : "";
  return (
    code === "ER_NO_SUCH_TABLE" ||
    /doesn't exist/i.test(msg) ||
    /Unknown table/i.test(msg)
  );
}

export async function GET(request) {
  try {
    await ensureVocabularySchema(pool);
    let cols;
    try {
      cols = await getVocabularyTableColumnSet();
    } catch (e0) {
      clearVocabularyTableColumnCache();
      if (isMissingVocabularyTable(e0)) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw e0;
    }

    if (!cols.has("topic")) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const level = (searchParams.get("level") || "beginner").toLowerCase();

    const whereParts = ["topic IS NOT NULL", "topic <> ''"];
    const params = [];

    if (cols.has("level")) {
      whereParts.unshift("level = ?");
      params.push(level);
    }

    const whereSql = whereParts.join(" AND ");

    const [rows] = await pool.query(
      `SELECT topic, COUNT(*) AS total
       FROM vocabulary
       WHERE ${whereSql}
       GROUP BY topic
       ORDER BY topic ASC`,
      params
    );

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({ topic: r.topic, total: Number(r.total || 0) })),
    });
  } catch (error) {
    console.error("[api/vocabulary/topics]", error);
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const isConn =
      code === "ECONNREFUSED" ||
      code === "ER_ACCESS_DENIED_ERROR" ||
      code === "ENOTFOUND" ||
      code === "ER_BAD_DB_ERROR";

    if (isMissingVocabularyTable(error)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const sqlMsg =
      error && typeof error === "object" && "sqlMessage" in error ? String(error.sqlMessage) : "";
    const detail =
      process.env.NODE_ENV === "development"
        ? ` ${error instanceof Error ? error.message : sqlMsg || ""}`.trimEnd()
        : sqlMsg
          ? ` (${sqlMsg})`
          : "";

    return NextResponse.json(
      {
        success: false,
        message: isConn
          ? "Không kết nối được database. Bật MySQL (XAMPP) và kiểm tra DB_NAME trong .env."
          : `Không tải được chủ đề.${detail}`.trim(),
      },
      { status: 500 }
    );
  }
}
