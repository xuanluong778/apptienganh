import { NextResponse } from "next/server";
import pool from "@/lib/db";

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = String(searchParams.get("mode") || "1");
    const requestedSection = Number(searchParams.get("section") || 1);
    const sectionSize = 10;

    await pool.query(
      "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa"
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM vocabulary
       WHERE level = 'beginner'
         AND word IS NOT NULL
         AND TRIM(word) <> ''
         AND vietnamese_meaning IS NOT NULL
         AND TRIM(vietnamese_meaning) <> ''`
    );
    const totalWords = Number(countRows[0]?.total || 0);
    if (!totalWords) {
      return NextResponse.json({ success: false, message: "No vocabulary data." }, { status: 404 });
    }

    const totalSections = Math.max(1, Math.ceil(totalWords / sectionSize));
    const section = Math.min(Math.max(1, requestedSection), totalSections);
    const offset = (section - 1) * sectionSize;

    const [rows] = await pool.query(
      `SELECT id, word, ipa, vietnamese_meaning, example_sentence, question_text, audio_url
       FROM vocabulary
       WHERE level = 'beginner'
         AND word IS NOT NULL
         AND TRIM(word) <> ''
         AND vietnamese_meaning IS NOT NULL
         AND TRIM(vietnamese_meaning) <> ''
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [sectionSize, offset]
    );
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "No words in this section." }, { status: 404 });
    }

    const [poolRows] = await pool.query(
      `SELECT word, vietnamese_meaning
       FROM vocabulary
       WHERE level = 'beginner'
         AND word IS NOT NULL
         AND TRIM(word) <> ''
         AND vietnamese_meaning IS NOT NULL
         AND TRIM(vietnamese_meaning) <> ''
       ORDER BY RAND()
       LIMIT 400`
    );

    const questions = [];
    const optionPoolVn = poolRows.map((r) => r.vietnamese_meaning).filter(Boolean);
    const optionPoolEn = poolRows.map((r) => r.word).filter(Boolean);

    for (const item of rows) {
      if (questions.length >= 10) break;
      if (!item.word) continue;

      if (mode === "1") {
        if (!item.vietnamese_meaning) continue;
        const wrong = shuffle(optionPoolVn.filter((v) => v !== item.vietnamese_meaning)).slice(0, 3);
        const options = shuffle([item.vietnamese_meaning, ...wrong]);
        questions.push({
          id: item.id,
          mode,
          prompt: item.word,
          ipa: item.ipa || "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: item.audio_url || "",
          correct_answer: item.vietnamese_meaning,
          options,
        });
      } else if (mode === "2") {
        if (!item.vietnamese_meaning) continue;
        const wrong = shuffle(optionPoolEn.filter((v) => v !== item.word)).slice(0, 3);
        const options = shuffle([item.word, ...wrong]);
        questions.push({
          id: item.id,
          mode,
          prompt: item.vietnamese_meaning,
          ipa: item.ipa || "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: item.audio_url || "",
          correct_answer: item.word,
          options,
        });
      } else {
        if (!item.vietnamese_meaning) continue;
        questions.push({
          id: item.id,
          mode: "3",
          prompt: item.vietnamese_meaning,
          ipa: item.ipa || "",
          example_sentence: item.example_sentence || "",
          question_text: item.question_text || "",
          audio_url: item.audio_url || "",
          correct_answer: item.word,
          options: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: questions.slice(0, sectionSize),
      meta: {
        section,
        section_size: sectionSize,
        total_sections: totalSections,
        total_words: totalWords,
      },
    });
  } catch (_error) {
    return NextResponse.json({ success: false, message: "Failed to create quiz round." }, { status: 500 });
  }
}
