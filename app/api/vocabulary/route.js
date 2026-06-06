import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeMediaUrl } from "@/lib/media-url";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensureUserWordProgressTable } from "@/lib/srs/ensure-schema";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import {
  buildVocabularySelectFragments,
  getVocabularyTableColumnSet,
} from "@/lib/vocabulary/vocabulary-columns";

export async function GET(request) {
  try {
    await ensureVocabularySchema(pool);
    const cols = await getVocabularyTableColumnSet();
    const { selectList, meaningCol, hasLevel, hasTopic, hasPos } = buildVocabularySelectFragments(cols);

    if (!meaningCol) {
      return NextResponse.json(
        {
          success: false,
          message: "Bảng vocabulary thiếu cột nghĩa (cần `meaning` hoặc `vietnamese_meaning`).",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 24)));
    const level = (searchParams.get("level") || "").trim().toLowerCase();
    const topic = (searchParams.get("topic") || "").trim();
    const pos = (searchParams.get("pos") || "").trim().toLowerCase();
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const studyFilter = (searchParams.get("study_filter") || "all").trim().toLowerCase();
    const bookmarkIdsRaw = (searchParams.get("bookmark_ids") || "").trim();
    const bookmarkIds = bookmarkIdsRaw
      ? bookmarkIdsRaw
          .split(",")
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const whereParams = [];
    let authRequired = false;

    if (hasLevel && level && level !== "all") {
      whereClauses.push("level = ?");
      whereParams.push(level);
    }

    if (topic && hasTopic) {
      whereClauses.push("topic = ?");
      whereParams.push(topic);
    }
    if (pos && hasPos) {
      whereClauses.push("part_of_speech = ?");
      whereParams.push(pos);
    }
    if (q) {
      whereClauses.push(`(LOWER(word) LIKE ? OR LOWER(COALESCE(\`${meaningCol}\`, '')) LIKE ?)`);
      whereParams.push(`%${q}%`, `%${q}%`);
    }

    if (studyFilter === "saved") {
      if (!bookmarkIds.length) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0 },
        });
      }
      whereClauses.push(`id IN (${bookmarkIds.map(() => "?").join(", ")})`);
      whereParams.push(...bookmarkIds);
    } else if (studyFilter !== "all") {
      const userId = await getSessionUserIdFromRequest(request);
      if (!userId) {
        authRequired = true;
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0 },
          auth_required: true,
        });
      }
      await ensureUserWordProgressTable();
      const progressBase = "SELECT word_id FROM user_word_progress WHERE user_id = ?";
      whereParams.push(userId);
      if (studyFilter === "learning") {
        whereClauses.push(`id IN (${progressBase})`);
      } else if (studyFilter === "review_today") {
        whereClauses.push(
          `id IN (${progressBase} AND next_review_at IS NOT NULL AND next_review_at <= NOW())`
        );
      } else if (studyFilter === "difficult") {
        whereClauses.push(
          `id IN (${progressBase} AND (wrong_count >= 2 OR (mastery_level = 0 AND wrong_count >= 1)))`
        );
      }
    }

    if (!whereClauses.length) {
      whereClauses.push("1=1");
    }

    const whereSql = whereClauses.join(" AND ");

    const [rows] = await pool.query(
      `SELECT ${selectList}
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
      auth_required: authRequired || undefined,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const isConn =
      code === "ECONNREFUSED" ||
      code === "ER_ACCESS_DENIED_ERROR" ||
      code === "ENOTFOUND" ||
      code === "ER_BAD_DB_ERROR";
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      {
        success: false,
        message: isConn
          ? "Không kết nối được database. Kiểm tra MySQL (XAMPP) và DB trong .env."
          : `Không tải được từ vựng.${detail}`.trim(),
      },
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

    const cols = await getVocabularyTableColumnSet();
    const meaningCol = cols.has("meaning") ? "meaning" : cols.has("vietnamese_meaning") ? "vietnamese_meaning" : null;
    const ipaCol = cols.has("ipa") ? "ipa" : cols.has("pronunciation") ? "pronunciation" : null;
    if (!meaningCol) {
      return NextResponse.json(
        { success: false, message: "Bảng vocabulary thiếu cột nghĩa." },
        { status: 500 }
      );
    }

    const q = (n) => `\`${n}\``;
    const insertCols = [`${q("word")}`];
    const placeholders = ["?"];
    const values = [word];

    if (ipaCol) {
      insertCols.push(q(ipaCol));
      placeholders.push("?");
      values.push(ipa);
    }
    insertCols.push(q(meaningCol));
    placeholders.push("?");
    values.push(vietnameseMeaning);

    if (cols.has("part_of_speech")) {
      insertCols.push(q("part_of_speech"));
      placeholders.push("?");
      values.push(partOfSpeech);
    }
    if (cols.has("example_sentence")) {
      insertCols.push(q("example_sentence"));
      placeholders.push("?");
      values.push(exampleSentence);
    }
    if (cols.has("example_sentence_vi")) {
      insertCols.push(q("example_sentence_vi"));
      placeholders.push("?");
      values.push(exampleSentenceVi);
    }
    if (cols.has("example_sentence_ipa")) {
      insertCols.push(q("example_sentence_ipa"));
      placeholders.push("?");
      values.push(exampleSentenceIpa);
    }
    if (cols.has("question_text")) {
      insertCols.push(q("question_text"));
      placeholders.push("?");
      values.push(questionText);
    }
    if (cols.has("image_url")) {
      insertCols.push(q("image_url"));
      placeholders.push("?");
      values.push(imageUrl);
    }
    if (cols.has("audio_url")) {
      insertCols.push(q("audio_url"));
      placeholders.push("?");
      values.push(audioUrl);
    }
    if (cols.has("level")) {
      insertCols.push(q("level"));
      placeholders.push("?");
      values.push(level);
    }

    const [result] = await pool.query(
      `INSERT INTO vocabulary (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`,
      values
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
