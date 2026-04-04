import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = (searchParams.get("level") || "beginner").toLowerCase();

    const [rows] = await pool.query(
      `SELECT topic, COUNT(*) AS total
       FROM vocabulary
       WHERE level = ?
         AND topic IS NOT NULL
         AND topic <> ''
       GROUP BY topic
       ORDER BY topic ASC`,
      [level]
    );

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({ topic: r.topic, total: Number(r.total || 0) })),
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch vocabulary topics." },
      { status: 500 }
    );
  }
}
