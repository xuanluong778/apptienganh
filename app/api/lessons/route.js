import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeMediaUrl } from "@/lib/media-url";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT
         id,
         COALESCE(NULLIF(word, ''), title) AS word,
         image,
         audio,
         created_at,
         updated_at
       FROM lessons
       ORDER BY id ASC`
    );

    const normalizedRows = rows.map((lesson) => ({
      ...lesson,
      image: normalizeMediaUrl(lesson.image),
      audio: normalizeMediaUrl(lesson.audio),
    }));

    return NextResponse.json({
      success: true,
      data: normalizedRows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lessons.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const word = typeof body.word === "string" ? body.word.trim() : "";
    const image = normalizeMediaUrl(body.image);
    const audio = normalizeMediaUrl(body.audio);

    if (!word || !image || !audio) {
      return NextResponse.json(
        {
          success: false,
          message: "word, image, and audio are required.",
        },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO lessons (title, word, image, audio)
       VALUES (?, ?, ?, ?)`,
      [word, word, image, audio]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Lesson created successfully.",
        data: {
          id: result.insertId,
          word,
          image,
          audio,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create lesson.",
      },
      { status: 500 }
    );
  }
}
