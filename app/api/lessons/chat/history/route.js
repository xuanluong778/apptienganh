import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureUserSessionsTable } from "@/lib/auth/ensure-session-schema";
import { loadRecentChatLogsForUi } from "@/lib/data/lesson-chat-logs";
import { parseComposedAiReply } from "@/lib/lessons/assistant-reply-ui";

async function requireAuthenticatedUser(request) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;
  await ensureUserSessionsTable();
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

function rowsToUiMessages(rows) {
  const messages = [];
  for (const row of rows) {
    const userText = String(row.message || "").trim();
    const aiRaw = String(row.ai_reply || "").trim();
    if (userText) {
      messages.push({ role: "user", text: userText });
    }
    if (aiRaw) {
      const parsed = parseComposedAiReply(aiRaw);
      if (parsed.text) {
        messages.push({
          role: "assistant",
          text: parsed.text,
          corrected_sentence: parsed.correctedSentence,
          ipa: parsed.ipa,
          pronunciation_tip: parsed.tip,
          mistakes_explanation: parsed.mistakesExplanation,
        });
      }
    }
  }
  return messages;
}

export async function GET(request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user?.id) {
      return NextResponse.json({ success: true, data: { messages: [] } });
    }
    const rows = await loadRecentChatLogsForUi(user.id, 6);
    return NextResponse.json({
      success: true,
      data: { messages: rowsToUiMessages(rows) },
    });
  } catch (error) {
    console.error("[api/lessons/chat/history] GET failed", error?.message || error);
    return NextResponse.json(
      { success: false, message: "Failed to load chat history." },
      { status: 500 }
    );
  }
}
