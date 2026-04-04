import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeMediaUrl } from "@/lib/media-url";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 24)));
    const level = (searchParams.get("level") || "beginner").toLowerCase();
    const topic = (searchParams.get("topic") || "").trim();
    const pos = (searchParams.get("pos") || "").trim().toLowerCase();
    const offset = (page - 1) * limit;

    const whereClauses = ["level = ?"];
    const whereParams = [level];

    if (topic) {
      whereClauses.push("topic = ?");
      whereParams.push(topic);
    }
    if (pos) {
      whereClauses.push("part_of_speech = ?");
      whereParams.push(pos);
    }

    const whereSql = whereClauses.join(" AND ");

    const [rows] = await pool.query(
      `SELECT id, word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_vi, example_sentence_ipa, question_text, topic, image_url, audio_url, example_audio_url, level
       FROM vocabulary
       WHERE ${whereSql}
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM vocabulary
       WHERE ${whereSql}`,
      whereParams
    );

    const normalizedRows = rows.map((item) => ({
      ...item,
      image_url: normalizeMediaUrl(item.image_url),
      audio_url: normalizeMediaUrl(item.audio_url),
      example_audio_url: normalizeMediaUrl(item.example_audio_url),
    }));

    return NextResponse.json({
      success: true,
      data: normalizedRows,
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.total || 0),
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch vocabulary." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Đăng nhập để thêm từ vựng." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const word = typeof body.word === "string" ? body.word.trim() : "";
    const ipa = typeof body.ipa === "string" ? body.ipa.trim() : "";
    const exampleSentence =
      typeof body.example_sentence === "string" ? body.example_sentence.trim() : "";
    const exampleSentenceVi =
      typeof body.example_sentence_vi === "string" ? body.example_sentence_vi.trim() : "";
    const questionText =
      typeof body.question_text === "string" ? body.question_text.trim() : "";
    const exampleSentenceIpa =
      typeof body.example_sentence_ipa === "string" ? body.example_sentence_ipa.trim() : "";
    const vietnameseMeaning =
      typeof body.vietnamese_meaning === "string" ? body.vietnamese_meaning.trim() : "";
    const partOfSpeech =
      typeof body.part_of_speech === "string" ? body.part_of_speech.trim().toLowerCase() : "other";
    const imageUrl = normalizeMediaUrl(body.image_url);
    const audioUrl = normalizeMediaUrl(body.audio_url);
    const level = typeof body.level === "string" ? body.level.toLowerCase() : "beginner";

    if (!word || word.length < 2 || !exampleSentence || !imageUrl || !audioUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "word (min 2 chars), example_sentence, image_url, audio_url are required.",
        },
        { status: 400 }
      );
    }

    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS question_text VARCHAR(255) NULL AFTER example_sentence"
    );
    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_ipa VARCHAR(500) NULL AFTER example_sentence"
    );
    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_vi VARCHAR(500) NULL AFTER example_sentence"
    );
    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa"
    );
    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(20) NULL AFTER vietnamese_meaning"
    );

    const [result] = await pool.query(
      `INSERT INTO vocabulary (word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_vi, example_sentence_ipa, question_text, image_url, audio_url, level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [word, ipa, vietnameseMeaning, partOfSpeech, exampleSentence, exampleSentenceVi, exampleSentenceIpa, questionText, imageUrl, audioUrl, level]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Vocabulary created successfully.",
        data: {
          id: result.insertId,
          word,
          ipa,
          vietnamese_meaning: vietnameseMeaning,
          part_of_speech: partOfSpeech,
          example_sentence: exampleSentence,
          example_sentence_vi: exampleSentenceVi,
          example_sentence_ipa: exampleSentenceIpa,
          question_text: questionText,
          image_url: imageUrl,
          audio_url: audioUrl,
          level,
        },
      },
      { status: 201 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to create vocabulary item." },
      { status: 500 }
    );
  }
}
