import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { isVbeeConfigured, synthesizeVbeeVietnamese } from "@/lib/vbee/synthesize-vietnamese";

async function requireAuthenticatedUser(request) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT u.id
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
    const user = await requireAuthenticatedUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in to use Vietnamese audio." },
        { status: 401 }
      );
    }

    if (!isVbeeConfigured()) {
      return NextResponse.json(
        {
          success: false,
          code: "VBEE_NOT_CONFIGURED",
          message: "VBEE TTS is not configured on the server.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ success: false, message: "text is required." }, { status: 400 });
    }

    const result = await synthesizeVbeeVietnamese(text);
    if (!result.ok) {
      const status =
        result.code === "NOT_CONFIGURED"
          ? 503
          : result.code === "NOT_VIETNAMESE"
            ? 400
            : 502;
      return NextResponse.json(
        { success: false, code: result.code, message: result.message },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        audioBase64: result.buffer.toString("base64"),
        contentType: result.contentType,
        characters: result.characters,
        cached: Boolean(result.fromCache),
      },
    });
  } catch (error) {
    console.error("[api/lessons/vbee-tts] POST failed", error?.message || error);
    return NextResponse.json(
      { success: false, message: "Failed to synthesize Vietnamese audio." },
      { status: 500 }
    );
  }
}
