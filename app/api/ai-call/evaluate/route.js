import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { evaluateAiCallSpeech } from "@/lib/ai/services/ai-call-evaluate.service";
import {
  assertLessonsChatAllowed,
  assertLessonsChatRateLimit,
  recordPooledAiUsageSuccess,
} from "@/lib/http/api-guards";
import { sanitizeHistory } from "@/lib/ai";

export const dynamic = "force-dynamic";

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

export async function POST(request) {
  try {
    const currentUser = await requireAuthenticatedUser(request);
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Đăng nhập để dùng Gọi thoại AI." },
        { status: 401 }
      );
    }

    const access = await assertLessonsChatAllowed(currentUser);
    if (!access.ok) {
      return NextResponse.json(
        {
          success: false,
          code: access.code,
          message: access.reason || "Gói hiện tại chưa hỗ trợ AI Call.",
        },
        { status: access.status ?? 402 }
      );
    }

    const rate = await assertLessonsChatRateLimit(currentUser);
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT", message: rate.reason || "Quá nhiều yêu cầu — thử lại sau." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const spokenText = String(body.spoken_text || body.spokenText || "").trim();
    const targetSentence = String(body.target_sentence || body.targetSentence || "").trim();
    const lessonContext = String(body.lesson_context || body.lessonContext || "").trim();
    const level = String(body.level || "A1").trim();
    const history = sanitizeHistory(body.history);

    if (!spokenText) {
      return NextResponse.json({ success: false, message: "spoken_text is required." }, { status: 400 });
    }

    const data = await evaluateAiCallSpeech({
      spokenText,
      targetSentence,
      lessonContext,
      level,
      history,
    });

    if (access.entitlement) {
      await recordPooledAiUsageSuccess(currentUser.id, access.entitlement);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      { success: false, message: `Evaluate failed.${detail}`.trim() },
      { status: 500 }
    );
  }
}
