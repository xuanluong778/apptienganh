import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonIdParam = searchParams.get("lesson_id");
    const lessonId = Number(lessonIdParam);

    if (!lessonIdParam || !Number.isInteger(lessonId) || lessonId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid lesson_id query parameter is required.",
        },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      `SELECT
        id,
        lesson_id,
        question_text,
        question_type,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        explanation
       FROM questions
       WHERE lesson_id = ?
       ORDER BY id ASC`,
      [lessonId]
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch questions.",
      },
      { status: 500 }
    );
  }
}
