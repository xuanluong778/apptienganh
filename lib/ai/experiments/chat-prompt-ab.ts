import type { ChatPromptVariant } from "../prompts/chat";
import { resolveChatPromptVariantForUser } from "../prompts/chat";
import pool from "@/lib/db";

/** @deprecated Prefer `resolveChatPromptVariantForUser` from `lib/ai/prompts/chat` (V1/V2). */
export function assignChatPromptVariant(userId: number | null | undefined): ChatPromptVariant {
  return resolveChatPromptVariantForUser(userId);
}

function variantForLegacyAbTable(v: ChatPromptVariant): "A" | "B" {
  return v === "V1" ? "A" : "B";
}

let tableEnsured = false;
let usageTableEnsured = false;

async function ensureChatPromptAbTable(): Promise<void> {
  if (tableEnsured) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_prompt_ab_events (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      session_id VARCHAR(64) NULL,
      trace_id CHAR(36) NOT NULL,
      variant ENUM('A','B') NOT NULL,
      response_length INT UNSIGNED NOT NULL DEFAULT 0,
      user_replied TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      replied_at DATETIME NULL,
      UNIQUE KEY uk_trace (trace_id),
      KEY idx_user_created (user_id, created_at),
      KEY idx_session (session_id),
      KEY idx_variant_replied (variant, user_replied, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  try {
    await pool.query(
      `ALTER TABLE chat_prompt_ab_events ADD COLUMN session_id VARCHAR(64) NULL AFTER user_id`
    );
  } catch {
    /* already has session_id */
  }
  try {
    await pool.query(`ALTER TABLE chat_prompt_ab_events ADD KEY idx_session (session_id)`);
  } catch {
    /* index exists */
  }
  tableEnsured = true;
}

async function ensureVariantUsageTable(): Promise<void> {
  if (usageTableEnsured) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_prompt_variant_usage (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NULL,
      variant VARCHAR(8) NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'getPrompt',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_created (user_id, created_at),
      KEY idx_variant_created (variant, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  usageTableEnsured = true;
}

/**
 * Fire-and-forget log whenever `getPrompt` / `getPromptForAiRoute` selects a chat variant.
 */
export function logChatPromptVariantSelection(params: {
  userId: number | null;
  variant: ChatPromptVariant;
  source: string;
}): void {
  void (async () => {
    try {
      await ensureVariantUsageTable();
      await pool.query(
        `INSERT INTO chat_prompt_variant_usage (user_id, variant, source) VALUES (?, ?, ?)`,
        [params.userId, params.variant, params.source.slice(0, 64)]
      );
    } catch {
      /* best-effort */
    }
  })();
}

/**
 * Call at the **start** of a new chat turn: marks the latest open exposure as “user replied” (engagement).
 */
export async function markChatPromptFollowUp(userId: number): Promise<void> {
  try {
    await ensureChatPromptAbTable();
    await pool.query(
      `UPDATE chat_prompt_ab_events e
       INNER JOIN (
         SELECT id FROM chat_prompt_ab_events
         WHERE user_id = ? AND user_replied = 0
         ORDER BY id DESC
         LIMIT 1
       ) latest ON e.id = latest.id
       SET e.user_replied = 1, e.replied_at = NOW()`,
      [userId]
    );
  } catch {
    /* best-effort; avoid breaking chat */
  }
}

export async function logChatPromptExposure(params: {
  userId: number;
  variant: ChatPromptVariant;
  responseLength: number;
  traceId: string;
  /** Client chat session (per-tab / device); links A/B exposure to `chat_session_metrics`. */
  sessionId?: string | null;
}): Promise<void> {
  try {
    await ensureChatPromptAbTable();
    const legacy = variantForLegacyAbTable(params.variant);
    const sid = String(params.sessionId ?? "").trim().slice(0, 64) || null;
    await pool.query(
      `INSERT INTO chat_prompt_ab_events (user_id, session_id, trace_id, variant, response_length, user_replied)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [params.userId, sid, params.traceId, legacy, params.responseLength]
    );
  } catch {
    /* best-effort */
  }
}
