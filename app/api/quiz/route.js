import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeMediaUrl } from "@/lib/media-url";
import { getVocabularyQuizColumns } from "@/lib/vocab-quiz-columns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickThreeWrong(meaningsPool, correct) {
  const c = String(correct || "").trim();
  const seen = new Set([c]);
  const out = [];
  const shuffled = shuffle(meaningsPool);
  for (const m of shuffled) {
    const t = String(m || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 3) break;
  }
  return out;
}

export async function GET() {
  try {
    const { meaning: meaningCol, pronunciation: pronCol } = await getVocabularyQuizColumns();

    const pronSelect = pronCol
      ? `TRIM(v.\`${pronCol}\`) AS pronunciation`
      : `'' AS pronunciation`;

    const [poolRows] = await pool.query(
      `SELECT DISTINCT TRIM(v.\`${meaningCol}\`) AS m
       FROM vocabulary v
       WHERE v.\`${meaningCol}\` IS NOT NULL AND TRIM(v.\`${meaningCol}\`) <> ''
       LIMIT 800`
    );
    const meaningPool = poolRows.map((r) => String(r.m || "").trim()).filter(Boolean);
    if (meaningPool.length < 4) {
      return NextResponse.json(
        { success: false, message: "Need at least 4 distinct meanings in vocabulary for the quiz." },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      `SELECT v.id, TRIM(v.word) AS word, ${pronSelect}, v.audio_url, TRIM(v.\`${meaningCol}\`) AS meaning
       FROM vocabulary v
       WHERE v.word IS NOT NULL AND TRIM(v.word) <> ''
         AND v.\`${meaningCol}\` IS NOT NULL AND TRIM(v.\`${meaningCol}\`) <> ''
       ORDER BY RAND()
       LIMIT 48`
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: "No vocabulary rows found." }, { status: 404 });
    }

    const questions = [];
    for (const row of rows) {
      if (questions.length >= 10) break;
      const correctAnswer = String(row.meaning || "").trim();
      const word = String(row.word || "").trim();
      if (!word || !correctAnswer) continue;

      const wrong = pickThreeWrong(meaningPool, correctAnswer);
      if (wrong.length < 3) {
        continue;
      }

      const options = shuffle([correctAnswer, ...wrong]);
      if (new Set(options).size !== 4) {
        continue;
      }

      questions.push({
        id: row.id,
        word,
        pronunciation: String(row.pronunciation || "").trim(),
        audio_url: normalizeMediaUrl(row.audio_url) || "",
        correctAnswer,
        options,
      });
    }

    if (!questions.length) {
      return NextResponse.json(
        { success: false, message: "Could not build quiz questions with 4 unique options." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { count: questions.length, target: 10 },
    });
  } catch (error) {
    console.error("[GET /api/quiz]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Quiz generation failed." },
      { status: 500 }
    );
  }
}
