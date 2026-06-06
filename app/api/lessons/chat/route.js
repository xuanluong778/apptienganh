import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  finalizeLessonsChatPayload,
  generateLessonsChatReply,
  sanitizeHistory,
} from "@/lib/ai";
import { insertLessonChatLog, loadRecentHistoryFromDb } from "@/lib/data/lesson-chat-logs";
import {
  assertLessonsChatAllowed,
  assertLessonsChatRateLimit,
  recordPooledAiUsageSuccess,
} from "@/lib/http/api-guards";
import { recordChatSessionUserMessage } from "@/lib/ai/experiments/chat-performance-metrics";
import { normalizePracticeMode } from "@/lib/lessons/practice-mode";
import {
  DEFAULT_LANGUAGE_SUPPORT_MODE,
  normalizeLanguageSupportMode,
} from "@/lib/lessons/language-support-mode";
import {
  DEFAULT_SELECTED_TEACHER,
  normalizeSelectedTeacher,
} from "@/lib/lessons/ai-teachers";

async function requireAuthenticatedUser(request) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

function composeStoredReply(finalAi) {
  return [
    finalAi.reply,
    finalAi.mistakes_explanation ? `Notes: ${finalAi.mistakes_explanation}` : "",
    finalAi.corrected_sentence ? `Corrected: ${finalAi.corrected_sentence}` : "",
    finalAi.ipa ? `IPA: ${finalAi.ipa}` : "",
    finalAi.pronunciation_tip ? `Tip: ${finalAi.pronunciation_tip}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request) {
  let message = "";
  let languageSupportMode = DEFAULT_LANGUAGE_SUPPORT_MODE;
  try {
    const currentUser = await requireAuthenticatedUser(request);
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in to use AI chat." },
        { status: 401 }
      );
    }

    const access = await assertLessonsChatAllowed(currentUser);
    if (!access.ok) {
      return NextResponse.json(
        {
          success: false,
          code: access.code,
          message: access.reason || "AI chat not available for this account.",
        },
        { status: access.status ?? 402 }
      );
    }
    const rate = await assertLessonsChatRateLimit(currentUser);
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT", message: rate.reason || "Too many requests. Try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    message = String(body.message || "").trim();
    const source = String(body.source || "text").toLowerCase() === "voice" ? "voice" : "text";
    const spokenText =
      typeof body.spoken_text === "string" && body.spoken_text.trim()
        ? body.spoken_text.trim()
        : null;
    const pronunciationScoreRaw = Number(body.pronunciation_score);
    const pronunciationScore =
      Number.isFinite(pronunciationScoreRaw) && pronunciationScoreRaw >= 0 && pronunciationScoreRaw <= 100
        ? Math.round(pronunciationScoreRaw)
        : null;
    const clientHistory = sanitizeHistory(body.history);
    const practiceMode = normalizePracticeMode(body.practice_mode);
    languageSupportMode = normalizeLanguageSupportMode(
      body.language_support_mode ?? body.languageSupportMode
    );
    selectedTeacher = normalizeSelectedTeacher(
      body.selectedTeacher ?? body.selected_teacher
    );

    let vocabularyWords = [];
    if (Array.isArray(body.vocabulary_words)) {
      vocabularyWords = body.vocabulary_words
        .map((w) => String(w || "").trim())
        .filter(Boolean)
        .slice(0, 20);
    }
    if (practiceMode === "vocabulary_practice" && vocabularyWords.length === 0) {
      const [lessonRows] = await pool.query(`SELECT word FROM lessons ORDER BY id ASC LIMIT 20`);
      vocabularyWords = lessonRows.map((row) => String(row.word || "").trim()).filter(Boolean);
    }

    if (!message) {
      return NextResponse.json({ success: false, message: "message is required." }, { status: 400 });
    }

    const sessionId =
      typeof body.session_id === "string" ? body.session_id.trim().slice(0, 64) : "";
    if (sessionId) {
      recordChatSessionUserMessage({
        sessionId,
        userId: currentUser?.id ?? null,
      });
    }

    const dbHistory = currentUser?.id ? await loadRecentHistoryFromDb(currentUser.id, 6) : [];
    const mergedHistory = [...dbHistory, ...clientHistory].slice(-10);

    if (process.env.NODE_ENV !== "production") {
      console.info("[api/lessons/chat] payload", {
        selectedTeacher,
        practiceMode,
        languageSupportMode,
        source,
        messageLength: message.length,
        historyTurns: mergedHistory.length,
      });
    }

    const aiPayload = await generateLessonsChatReply({
      message,
      history: mergedHistory,
      vipPriority: Boolean(access.entitlement?.vipPriority),
      practiceMode,
      vocabularyWords,
      languageSupportMode,
      selectedTeacher,
    });
    const finalAi = finalizeLessonsChatPayload(aiPayload, message, { languageSupportMode });
    const composedReply = composeStoredReply(finalAi);

    await insertLessonChatLog({
      userId: currentUser.id,
      source,
      message,
      composedReply,
      spokenText,
      pronunciationScore,
    });

    if (access.entitlement && aiPayload) {
      await recordPooledAiUsageSuccess(currentUser.id, access.entitlement);
    }

    return NextResponse.json({
      success: true,
      data: {
        reply: finalAi.reply,
        corrected_sentence: finalAi.corrected_sentence,
        ipa: finalAi.ipa,
        pronunciation_tip: finalAi.pronunciation_tip,
        mistakes_explanation: finalAi.mistakes_explanation || "",
      },
    });
  } catch (_error) {
    const fallback = finalizeLessonsChatPayload(null, message, { languageSupportMode });
    return NextResponse.json(
      {
        success: true,
        data: {
          reply: fallback.reply,
          corrected_sentence: fallback.corrected_sentence,
          ipa: fallback.ipa,
          pronunciation_tip: fallback.pronunciation_tip,
          mistakes_explanation: fallback.mistakes_explanation || "",
        },
      },
      { status: 200 }
    );
  }
}
