import type { ChatPromptVariant } from "../prompts/chat";
import pool from "@/lib/db";

function variantToAb(v: ChatPromptVariant): "A" | "B" {
  return v === "V1" ? "A" : "B";
}

let sessionTableReady = false;

async function ensureChatSessionMetricsTable(): Promise<void> {
  if (sessionTableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_session_metrics (
      session_id VARCHAR(64) NOT NULL,
      user_id BIGINT UNSIGNED NULL,
      user_message_count INT UNSIGNED NOT NULL DEFAULT 0,
      last_prompt_variant_ab ENUM('A','B') NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id),
      KEY idx_user_updated (user_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  sessionTableReady = true;
}

/**
 * Each user turn toward the assistant (one increment per incoming user message).
 * Call early in the request – fire-and-forget safe.
 */
export function recordChatSessionUserMessage(params: {
  sessionId: string;
  userId: number | null;
}): void {
  const sid = String(params.sessionId || "").trim().slice(0, 64);
  if (!sid) return;

  void (async () => {
    try {
      await ensureChatSessionMetricsTable();
      await pool.query(
        `INSERT INTO chat_session_metrics (session_id, user_id, user_message_count)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE
           user_message_count = user_message_count + 1,
           user_id = COALESCE(?, user_id)`,
        [sid, params.userId, params.userId]
      );
    } catch {
      /* best-effort */
    }
  })();
}

/** After a successful assistant reply, tie session to last A/B arm for rollups. */
export function updateChatSessionLastVariant(params: {
  sessionId: string | null | undefined;
  variant: ChatPromptVariant;
}): void {
  const sid = String(params.sessionId || "").trim().slice(0, 64);
  if (!sid) return;

  void (async () => {
    try {
      await ensureChatSessionMetricsTable();
      const ab = variantToAb(params.variant);
      await pool.query(
        `UPDATE chat_session_metrics SET last_prompt_variant_ab = ? WHERE session_id = ?`,
        [ab, sid]
      );
    } catch {
      /* best-effort */
    }
  })();
}

/**
 * Reply rate is derived from `chat_prompt_ab_events.user_replied` grouped by `variant` (A/B).
 * Example:
 *   SELECT variant, COUNT(*) exposures, SUM(user_replied) replies, AVG(user_replied) reply_rate
 *   FROM chat_prompt_ab_events GROUP BY variant;
 *
 * Messages per session:
 *   SELECT session_id, user_message_count, last_prompt_variant_ab FROM chat_session_metrics;
 */
