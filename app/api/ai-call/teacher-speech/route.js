import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { isDbConnectionError } from "@/lib/db-errors";
import { synthesizeTeacherSpeech } from "@/lib/ai-call/synthesize-teacher-speech";
import {
  assertLessonsChatAllowed,
  assertLessonsChatRateLimit,
  recordPooledAiUsageSuccess,
} from "@/lib/http/api-guards";

export const dynamic = "force-dynamic";

function devTtsBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    String(process.env.AI_CALL_DEV_TTS ?? "true").toLowerCase() !== "false"
  );
}

async function requireAuthenticatedUser(request) {
  try {
    const token = request.cookies.get("session_token")?.value;
    if (!token) return null;
    const [rows] = await pool.query(
      `SELECT u.id FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  } catch (error) {
    if (isDbConnectionError(error)) return null;
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawSegments = Array.isArray(body.segments) ? body.segments : [];
    const segments = rawSegments
      .map((s) => ({
        lang: String(s.lang || "en").toLowerCase().startsWith("vi") ? "vi" : "en",
        text: String(s.text || "").trim(),
      }))
      .filter((s) => s.text)
      .slice(0, 12);

    if (!segments.length) {
      return NextResponse.json({ success: false, message: "segments is required." }, { status: 400 });
    }

    let currentUser = null;
    try {
      currentUser = await requireAuthenticatedUser(request);
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
    }

    const allowAnonymous = devTtsBypassEnabled();

    if (currentUser?.id) {
      try {
        const access = await assertLessonsChatAllowed(currentUser);
        if (!access.ok) {
          return NextResponse.json(
            { success: false, code: access.code, message: access.reason || "Gói hiện tại chưa hỗ trợ TTS." },
            { status: access.status ?? 402 }
          );
        }

        const rate = await assertLessonsChatRateLimit(currentUser);
        if (!rate.ok) {
          return NextResponse.json(
            { success: false, code: "RATE_LIMIT", message: rate.reason || "Quá nhiều yêu cầu TTS." },
            { status: 429 }
          );
        }

        const result = await synthesizeTeacherSpeech(segments);

        if (result.ok && access.entitlement) {
          try {
            await recordPooledAiUsageSuccess(currentUser.id, access.entitlement);
          } catch (error) {
            if (!isDbConnectionError(error)) throw error;
          }
        }

        if (result.ok) {
          return NextResponse.json({
            success: true,
            data: {
              audioBase64: result.audioBase64,
              contentType: result.contentType,
              provider: result.provider,
              subtitle: result.subtitle,
              segments: result.segments,
            },
          });
        }

        return NextResponse.json({
          success: true,
          data: null,
          fallback: result.fallback,
          subtitle: result.subtitle,
          provider: "browser",
        });
      } catch (error) {
        if (!isDbConnectionError(error)) throw error;
      }
    }

    if (!allowAnonymous) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Đăng nhập để nghe giọng giáo viên AI." },
        { status: 401 }
      );
    }

    const result = await synthesizeTeacherSpeech(segments);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        data: {
          audioBase64: result.audioBase64,
          contentType: result.contentType,
          provider: result.provider,
          subtitle: result.subtitle,
          segments: result.segments,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
      fallback: result.fallback,
      subtitle: result.subtitle,
      provider: "browser",
    });
  } catch (error) {
    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error ? ` ${error.message}` : "";
    return NextResponse.json(
      { success: false, message: `Teacher speech failed.${detail}`.trim() },
      { status: 500 }
    );
  }
}
