import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import { getVocabularyQuizColumns } from "@/lib/vocab-quiz-columns";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensureUserWordProgressTable } from "@/lib/srs/ensure-schema";
import { normalizeMediaUrl } from "@/lib/media-url";

/** Tối đa số phần hiển thị (P1…P100); tránh hàng trăm nút và khối lượng quiz quá lớn. */
const MAX_QUIZ_SECTIONS = 100;
const SECTION_SIZE = 10;
/** Lấy từ index nhanh, trộn trong Node — không dùng ORDER BY RAND() (rất chậm với ~10k dòng). */
const POOL_FETCH_LIMIT = 1200;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function displayMeaning(row) {
  const w = String(row.word || "").trim();
  const m = String(row.vietnamese_meaning || "").trim();
  if (m) return m;
  return "";
}

export async function GET(request) {
  try {
    await ensureVocabularySchema(pool);
    const { meaning: meaningCol, pronunciation: pronCol } = await getVocabularyQuizColumns();

    const mField = `\`${meaningCol.replace(/`/g, "")}\``;
    const ipaExpr = pronCol ? `TRIM(\`${pronCol.replace(/`/g, "")}\`)` : `''`;
    const mcPlain = meaningCol.replace(/`/g, "");
    const pcPlain = pronCol ? pronCol.replace(/`/g, "") : "";
    const ipaExprJoin = pcPlain ? `TRIM(v.\`${pcPlain}\`)` : `''`;
    const selectListJoin = `v.id, v.word, ${ipaExprJoin} AS ipa, TRIM(v.\`${mcPlain}\`) AS vietnamese_meaning, v.example_sentence, v.question_text, v.audio_url, TRIM(COALESCE(v.image_url, '')) AS image_url`;

    const { searchParams } = new URL(request.url);
    const mode = String(searchParams.get("mode") || "1");
    const requestedSection = Number(searchParams.get("section") || 1);
    const source = String(searchParams.get("source") || "").trim().toLowerCase();
    const reviewPreferred = source === "review";

    const baseWordWhere = `word IS NOT NULL AND TRIM(word) <> ''`;

    const [[beginnerCount]] = await pool.query(
      `SELECT COUNT(*) AS total FROM vocabulary WHERE level = 'beginner' AND ${baseWordWhere}`
    );
    let totalWords = Number(beginnerCount?.total || 0);
    let levelSql = "level = ?";
    let levelParams = ["beginner"];

    if (!totalWords) {
      const [[anyCount]] = await pool.query(
        `SELECT COUNT(*) AS total FROM vocabulary WHERE ${baseWordWhere}`
      );
      totalWords = Number(anyCount?.total || 0);
      levelSql = "1=1";
      levelParams = [];
    }

    if (!totalWords) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chưa có từ vựng trong database. Vào Admin → Import vocabulary hoặc chạy seed/import SQL.",
        },
        { status: 404 }
      );
    }

    const rawSections = Math.max(1, Math.ceil(totalWords / SECTION_SIZE));
    const totalSections = Math.min(rawSections, MAX_QUIZ_SECTIONS);
    const section = Math.min(Math.max(1, requestedSection), totalSections);
    const offset = (section - 1) * SECTION_SIZE;

    const selectList = `id, word, ${ipaExpr} AS ipa, TRIM(${mField}) AS vietnamese_meaning, example_sentence, question_text, audio_url, TRIM(COALESCE(image_url, '')) AS image_url`;

    // SRS integration: prioritize due review words, then fallback to section words.
    const userId = await getSessionUserIdFromRequest(request).catch(() => null);
    let reviewRows = [];
    if (reviewPreferred && !userId) {
      return NextResponse.json({ success: false, message: "Đăng nhập để ôn tập." }, { status: 401 });
    }
    const joinLevelSql = levelSql === "1=1" ? "1=1" : "v.level = ?";
    const joinBaseWordWhere = `v.word IS NOT NULL AND TRIM(v.word) <> ''`;

    if (reviewPreferred && userId) {
      try {
        await ensureUserWordProgressTable();
        const [r] = await pool.query(
          `SELECT ${selectListJoin}
           FROM user_word_progress p
           INNER JOIN vocabulary v ON v.id = p.word_id
           WHERE p.user_id = ?
             AND p.next_review_at IS NOT NULL
             AND p.next_review_at <= NOW()
             AND ${joinLevelSql} AND ${joinBaseWordWhere}
           ORDER BY p.next_review_at ASC
           LIMIT ?`,
          [userId, ...levelParams, SECTION_SIZE]
        );
        reviewRows = r || [];
      } catch (_e) {
        reviewRows = [];
      }
    }

    const usedIds = new Set(reviewRows.map((x) => Number(x.id)).filter((n) => Number.isFinite(n)));
    const remaining = Math.max(0, SECTION_SIZE - reviewRows.length);
    let fallbackRows = [];
    // Review flow: if no due words, fallback to new words (keep quiz playable).
    if (remaining > 0) {
      const notIn =
        usedIds.size > 0 ? `AND id NOT IN (${Array.from(usedIds).map(() => "?").join(", ")})` : "";
      const notInParams = usedIds.size > 0 ? Array.from(usedIds) : [];
      const [rows] = await pool.query(
        `SELECT ${selectList}
         FROM vocabulary
         WHERE ${levelSql} AND ${baseWordWhere}
         ${notIn}
         ORDER BY id ASC
         LIMIT ? OFFSET ?`,
        [...levelParams, ...notInParams, remaining, offset]
      );
      fallbackRows = rows || [];
    }

    const rowsForQuiz = [...reviewRows, ...fallbackRows];
    if (!rowsForQuiz.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Không có từ để tạo quiz. Hãy import thêm từ vựng hoặc thử lại.",
        },
        { status: 404 }
      );
    }

    const [poolAll] = await pool.query(
      `SELECT word, TRIM(${mField}) AS vietnamese_meaning, ${ipaExpr} AS ipa, audio_url
       FROM vocabulary
       WHERE ${levelSql} AND ${baseWordWhere}
       ORDER BY id ASC
       LIMIT ?`,
      [...levelParams, POOL_FETCH_LIMIT]
    );
    const poolRows = shuffle(poolAll).slice(0, Math.min(500, poolAll.length));

    const wordMeta = new Map();
    for (const r of poolAll) {
      const w = String(r.word || "").trim();
      if (!w) continue;
      wordMeta.set(w.toLowerCase(), {
        ipa: String(r.ipa || "").trim(),
        audio_url: String(r.audio_url || "").trim(),
      });
    }

    const questions = [];
    const optionPoolVn = poolRows.map((r) => displayMeaning(r)).filter(Boolean);
    const optionPoolEn = poolRows.map((r) => r.word).filter(Boolean);

    for (const item of rowsForQuiz) {
      if (questions.length >= SECTION_SIZE) break;
      if (!item.word) continue;

      const vn = displayMeaning(item);
      if (!vn) continue;

      const imageUrl = normalizeMediaUrl(item.image_url);

      if (mode === "1") {
        const wrong = shuffle(optionPoolVn.filter((v) => v !== vn)).slice(0, 3);
        const options = shuffle([vn, ...wrong]);
        questions.push({
          id: item.id,
          mode,
          prompt: item.word,
          ipa: item.ipa || "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: item.audio_url || "",
          image_url: imageUrl,
          correct_answer: vn,
          options,
        });
      } else if (mode === "2") {
        const wrong = shuffle(optionPoolEn.filter((v) => v !== item.word)).slice(0, 3);
        const optionWords = shuffle([item.word, ...wrong]);
        const options = optionWords.map((w) => {
          const key = String(w || "").trim().toLowerCase();
          const meta = wordMeta.get(key) || { ipa: "", audio_url: "" };
          return { word: w, ipa: meta.ipa, audio_url: meta.audio_url };
        });
        questions.push({
          id: item.id,
          mode,
          prompt: vn,
          ipa: "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: "",
          image_url: imageUrl,
          correct_answer: item.word,
          options,
        });
      } else {
        questions.push({
          id: item.id,
          mode: "3",
          prompt: vn,
          ipa: item.ipa || "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: item.audio_url || "",
          image_url: imageUrl,
          correct_answer: item.word,
          options: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: questions.slice(0, SECTION_SIZE),
      meta: {
        section,
        section_size: SECTION_SIZE,
        total_sections: totalSections,
        total_words: totalWords,
        max_sections: MAX_QUIZ_SECTIONS,
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const isConn =
      code === "ECONNREFUSED" ||
      code === "ER_ACCESS_DENIED_ERROR" ||
      code === "ENOTFOUND" ||
      code === "ER_BAD_DB_ERROR";
    const sqlMsg = error && typeof error === "object" && "sqlMessage" in error ? String(error.sqlMessage) : "";
    const hint =
      sqlMsg && (sqlMsg.includes("vietnamese_meaning") || sqlMsg.includes("meaning"))
        ? " Kiểm tra bảng vocabulary có cột nghĩa (meaning hoặc vietnamese_meaning)."
        : "";
    const devDetail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` (${error.message})` : "";

    return NextResponse.json(
      {
        success: false,
        message: isConn
          ? "Không kết nối được database. Kiểm tra MySQL/XAMPP và file .env (DB_NAME, DB_USER)."
          : `Không tạo được vòng quiz.${hint}${devDetail}`.trim(),
      },
      { status: 500 }
    );
  }
}
