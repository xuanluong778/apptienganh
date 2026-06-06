/**
 * Phase 2: Flush Redis voice usage to MySQL.
 * Triggered from gateway on WS close. Job: { userId, ymd }.
 *
 * Redis key: voice:usage:daily:{userId}:{YYYYMMDD}
 * Fields: stt_audio_ms, llm_tokens_in, llm_tokens_out, tts_bytes
 */

import { Worker } from "bullmq";
import Redis from "ioredis";
import mysql from "mysql2/promise";

const REDIS_URL = String(process.env.REDIS_URL || "").trim();
if (!REDIS_URL) {
  // eslint-disable-next-line no-console
  console.error("[voice-usage-worker] Missing REDIS_URL");
  process.exit(1);
}

function poolConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "english_app",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  };
}

const db = mysql.createPool(poolConfig());
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

async function ensureSchema() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS voice_usage_daily (
      user_id BIGINT UNSIGNED NOT NULL,
      usage_date DATE NOT NULL,
      stt_audio_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
      llm_tokens_in BIGINT UNSIGNED NOT NULL DEFAULT 0,
      llm_tokens_out BIGINT UNSIGNED NOT NULL DEFAULT 0,
      tts_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, usage_date),
      KEY idx_usage_date (usage_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

function usageKey(userId, ymd) {
  return `voice:usage:daily:${userId}:${ymd}`;
}
function usageMonthKey(userId, ym) {
  return `voice:usage:month:${userId}:${ym}`;
}

function ymdToDate(ymd) {
  const s = String(ymd || "");
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

await ensureSchema();

await db.query(
  `CREATE TABLE IF NOT EXISTS voice_usage_monthly (
    user_id BIGINT UNSIGNED NOT NULL,
    usage_month CHAR(7) NOT NULL,
    stt_audio_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
    llm_tokens_in BIGINT UNSIGNED NOT NULL DEFAULT 0,
    llm_tokens_out BIGINT UNSIGNED NOT NULL DEFAULT 0,
    tts_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, usage_month)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
);

const worker = new Worker(
  "voice-usage",
  async (job) => {
    const userIdRaw = job.data?.userId;
    const ymd = String(job.data?.ymd || "").trim();
    const userId = Number(userIdRaw);
    const usageDate = ymdToDate(ymd);
    if (!Number.isFinite(userId) || userId <= 0 || !usageDate) return;

    const key = usageKey(userId, ymd);
    const h = await redis.hgetall(key);
    const stt = Number(h.stt_audio_ms || 0);
    const inTok = Number(h.llm_tokens_in || 0);
    const outTok = Number(h.llm_tokens_out || 0);
    const tts = Number(h.tts_bytes || 0);

    await db.query(
      `INSERT INTO voice_usage_daily (user_id, usage_date, stt_audio_ms, llm_tokens_in, llm_tokens_out, tts_bytes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stt_audio_ms = GREATEST(stt_audio_ms, VALUES(stt_audio_ms)),
         llm_tokens_in = GREATEST(llm_tokens_in, VALUES(llm_tokens_in)),
         llm_tokens_out = GREATEST(llm_tokens_out, VALUES(llm_tokens_out)),
         tts_bytes = GREATEST(tts_bytes, VALUES(tts_bytes))`,
      [userId, usageDate, Math.max(0, stt), Math.max(0, inTok), Math.max(0, outTok), Math.max(0, tts)]
    );

    const ym = `${usageDate.slice(0, 7)}`;
    const mh = await redis.hgetall(usageMonthKey(userId, ym.replace("-", "")));
    const mstt = Number(mh.stt_audio_ms || 0);
    const minTok = Number(mh.llm_tokens_in || 0);
    const moutTok = Number(mh.llm_tokens_out || 0);
    const mtts = Number(mh.tts_bytes || 0);
    await db.query(
      `INSERT INTO voice_usage_monthly (user_id, usage_month, stt_audio_ms, llm_tokens_in, llm_tokens_out, tts_bytes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stt_audio_ms = GREATEST(stt_audio_ms, VALUES(stt_audio_ms)),
         llm_tokens_in = GREATEST(llm_tokens_in, VALUES(llm_tokens_in)),
         llm_tokens_out = GREATEST(llm_tokens_out, VALUES(llm_tokens_out)),
         tts_bytes = GREATEST(tts_bytes, VALUES(tts_bytes))`,
      [userId, ym, Math.max(0, mstt), Math.max(0, minTok), Math.max(0, moutTok), Math.max(0, mtts)]
    );
  },
  { connection: new Redis(REDIS_URL, { maxRetriesPerRequest: null }), concurrency: 4 }
);

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error("[voice-usage-worker] job failed", job?.id, err?.message || err);
});

// eslint-disable-next-line no-console
console.log("[voice-usage-worker] started");

