import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { ensureUserStatsTables } from "@/lib/srs/ensure-stats";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";

export const dynamic = "force-dynamic";

function pct(correct, total) {
  const t = Number(total || 0);
  const c = Number(correct || 0);
  if (!t) return 0;
  return Math.round((c / t) * 100);
}

function buildSuggestion({ weakWords, weakTopics }) {
  if (weakWords.length === 0 && weakTopics.length === 0) {
    return "Bạn đang làm rất tốt. Hãy giữ streak và ôn lại 10 từ mỗi ngày.";
  }
  const topWord = weakWords[0]?.word;
  const topTopic = weakTopics[0]?.topic;
  if (topWord && topTopic) {
    return `Hôm nay bạn nên ôn lại chủ đề “${topTopic}” và luyện kỹ từ “${topWord}”: nghe phát âm 3 lần, đọc theo 3 lần, rồi làm lại quiz.`;
  }
  if (topWord) {
    return `Hôm nay hãy luyện kỹ từ “${topWord}”: nghe phát âm 3 lần, đọc theo 3 lần, rồi làm lại quiz.`;
  }
  if (topTopic) {
    return `Hôm nay bạn nên ôn lại chủ đề “${topTopic}”: chọn 10 từ và luyện nghe/đọc theo trước khi làm quiz.`;
  }
  return "Hôm nay hãy review trước, rồi học thêm 10 từ mới.";
}

export async function GET(request) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    await ensureUserStatsTables(); // includes user_events
    await ensureVocabularySchema(pool);

    // Recent window for insights (last 14 days).
    const [wordRows] = await pool.query(
      `SELECT v.id AS word_id,
              v.word AS word,
              COUNT(*) AS total,
              SUM(CASE WHEN e.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM user_events e
       INNER JOIN vocabulary v ON v.id = e.word_id
       WHERE e.user_id = ?
         AND e.event_type = 'quiz_answer'
         AND e.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         AND e.created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       GROUP BY v.id, v.word
       HAVING COUNT(*) >= 3
       ORDER BY (SUM(CASE WHEN e.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*)) ASC, total DESC
       LIMIT 6`,
      [userId]
    );

    const weak_words = (wordRows || []).map((r) => ({
      word_id: Number(r.word_id || 0),
      word: String(r.word || "").trim(),
      attempts: Number(r.total || 0),
      correct_rate: pct(r.correct, r.total),
    }));

    const [topicRows] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(v.topic), ''), 'General') AS topic,
              COUNT(*) AS total,
              SUM(CASE WHEN e.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM user_events e
       INNER JOIN vocabulary v ON v.id = e.word_id
       WHERE e.user_id = ?
         AND e.event_type = 'quiz_answer'
         AND e.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         AND e.created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       GROUP BY topic
       HAVING COUNT(*) >= 8
       ORDER BY (SUM(CASE WHEN e.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*)) ASC, total DESC
       LIMIT 4`,
      [userId]
    );

    const low_accuracy_topics = (topicRows || []).map((r) => ({
      topic: String(r.topic || "General"),
      attempts: Number(r.total || 0),
      correct_rate: pct(r.correct, r.total),
    }));

    const suggestion = buildSuggestion({
      weakWords: weak_words,
      weakTopics: low_accuracy_topics,
    });

    return NextResponse.json({
      success: true,
      data: {
        weak_words,
        low_accuracy_topics,
        suggestion,
      },
    });
  } catch (_error) {
    return NextResponse.json({ success: false, message: "Failed to load insights." }, { status: 500 });
  }
}

