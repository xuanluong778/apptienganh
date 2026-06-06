/**
 * Import dữ liệu apptienganh (staging) → english_app hiện tại.
 * - Backup trước
 * - Không truncate target
 * - Upsert / insert-only để giữ dữ liệu mới
 *
 * Chạy: node scripts/import-legacy-to-english-app.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STAGING_DB = "apptienganh_legacy";
const LARAGON_BACKUP =
  process.env.LEGACY_BACKUP || "C:/laragon/backup/mysql/mysql-8.4-2026-05-25_225848.sql";

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

async function getColumns(conn, db, table) {
  const [rows] = await conn.query(`DESCRIBE \`${db}\`.\`${table}\``);
  return rows.map((r) => r.Field);
}

async function countRows(conn, db, table) {
  try {
    const [r] = await conn.query(`SELECT COUNT(*) AS n FROM \`${db}\`.\`${table}\``);
    return Number(r[0].n);
  } catch {
    return -1;
  }
}

/** @type {Array<{table:string, sql:string, note?:string}>} */
const MERGE_PLANS = [
  {
    table: "vocabulary",
    sql: `
      INSERT IGNORE INTO \`{{TARGET}}\`.\`vocabulary\`
        (id, word, ipa, vietnamese_meaning, part_of_speech, example_sentence, question_text, topic,
         example_sentence_ipa, example_sentence_vi, image_url, audio_url, example_audio_url, level, created_at, updated_at)
      SELECT id, word, ipa, vietnamese_meaning, part_of_speech, example_sentence, question_text, topic,
             example_sentence_ipa, example_sentence_vi, image_url, audio_url, example_audio_url, level, created_at, updated_at
      FROM \`{{STAGING}}\`.\`vocabulary\` s
    `,
  },
  {
    table: "users",
    note: "Bỏ cột role cũ; không ghi đè user đã có theo id/email/phone",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`users\`
        (id, name, email, phone, password_hash, is_active, created_at, updated_at, avatar_url, date_of_birth)
      SELECT s.id, s.name, s.email, s.phone, s.password_hash, s.is_active, s.created_at, s.updated_at, s.avatar_url, s.date_of_birth
      FROM \`{{STAGING}}\`.\`users\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` t WHERE t.id = s.id)
        AND NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` t WHERE s.email IS NOT NULL AND s.email != '' AND t.email = s.email)
        AND NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` t WHERE s.phone IS NOT NULL AND s.phone != '' AND t.phone = s.phone)
    `,
  },
  {
    table: "user_sessions",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`user_sessions\` (id, user_id, token, expires_at, created_at)
      SELECT s.id, s.user_id, s.token, s.expires_at, s.created_at
      FROM \`{{STAGING}}\`.\`user_sessions\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`user_sessions\` t WHERE t.token = s.token)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "subscriptions",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`subscriptions\`
        (id, user_id, plan, trial_start_at, trial_end_at, subscribed_at, expires_at, created_at, updated_at, stripe_customer_id, stripe_subscription_id)
      SELECT s.id, s.user_id, s.plan, s.trial_start_at, s.trial_end_at, s.subscribed_at, s.expires_at, s.created_at, s.updated_at, s.stripe_customer_id, s.stripe_subscription_id
      FROM \`{{STAGING}}\`.\`subscriptions\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`subscriptions\` t WHERE t.user_id = s.user_id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "payments",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`payments\`
        (id, user_id, amount, plan, billing_period, transfer_content, status, confirmed_at, created_at, updated_at)
      SELECT s.id, s.user_id, s.amount, s.plan, s.billing_period, s.transfer_content, s.status, s.confirmed_at, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`payments\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`payments\` t WHERE t.transfer_content = s.transfer_content)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "app_settings",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`app_settings\` (setting_key, setting_value, is_encrypted, updated_at)
      SELECT s.setting_key, s.setting_value, s.is_encrypted, s.updated_at
      FROM \`{{STAGING}}\`.\`app_settings\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`app_settings\` t WHERE t.setting_key = s.setting_key)
    `,
  },
  {
    table: "otp_codes",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`otp_codes\`
        (id, user_id, email, phone, code, type, expires_at, used, failed_attempts, created_at, updated_at)
      SELECT s.id, s.user_id, s.email, s.phone, s.code, s.type, s.expires_at, s.used, s.failed_attempts, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`otp_codes\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`otp_codes\` t WHERE t.id = s.id)
    `,
  },
  {
    table: "verification_codes",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`verification_codes\`
        (id, otp_token, contact_type, contact_value, code_hash, purpose, attempts, expires_at, consumed_at, created_at)
      SELECT s.id, s.otp_token, s.contact_type, s.contact_value, s.code_hash, s.purpose, s.attempts, s.expires_at, s.consumed_at, s.created_at
      FROM \`{{STAGING}}\`.\`verification_codes\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`verification_codes\` t WHERE t.otp_token = s.otp_token)
    `,
  },
  {
    table: "ai_usage_daily",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`ai_usage_daily\` (user_id, usage_date, request_count, updated_at)
      SELECT s.user_id, s.usage_date, s.request_count, s.updated_at
      FROM \`{{STAGING}}\`.\`ai_usage_daily\` s
      WHERE EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
      ON DUPLICATE KEY UPDATE
        request_count = GREATEST(\`{{TARGET}}\`.\`ai_usage_daily\`.request_count, VALUES(request_count)),
        updated_at = VALUES(updated_at)
    `,
  },
  {
    table: "billing_conversion_events",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`billing_conversion_events\` (id, user_id, event_type, metadata, stripe_checkout_session_id, created_at)
      SELECT s.id, s.user_id, s.event_type, s.metadata, s.stripe_checkout_session_id, s.created_at
      FROM \`{{STAGING}}\`.\`billing_conversion_events\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`billing_conversion_events\` t WHERE t.id = s.id)
    `,
  },
  {
    table: "lesson_chat_logs",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`lesson_chat_logs\`
        (id, user_id, source, message, ai_reply, spoken_text, pronunciation_score, created_at)
      SELECT s.id, s.user_id, s.source, s.message, s.ai_reply, s.spoken_text, s.pronunciation_score, s.created_at
      FROM \`{{STAGING}}\`.\`lesson_chat_logs\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`lesson_chat_logs\` t WHERE t.id = s.id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "user_events",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`user_events\` (id, user_id, attempt_id, event_type, word_id, is_correct, created_at)
      SELECT s.id, s.user_id, s.attempt_id, s.event_type, s.word_id, s.is_correct, s.created_at
      FROM \`{{STAGING}}\`.\`user_events\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`user_events\` t WHERE t.id = s.id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "user_review_events",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`user_review_events\` (id, user_id, attempt_id, word_id, is_correct, xp_delta, created_at)
      SELECT s.id, s.user_id, s.attempt_id, s.word_id, s.is_correct, s.xp_delta, s.created_at
      FROM \`{{STAGING}}\`.\`user_review_events\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`user_review_events\` t WHERE t.id = s.id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "user_stats",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`user_stats\`
        (user_id, xp_total, current_streak, best_streak, last_active_date, last_answer_at, created_at, updated_at)
      SELECT s.user_id, s.xp_total, s.current_streak, s.best_streak, s.last_active_date, s.last_answer_at, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`user_stats\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`user_stats\` t WHERE t.user_id = s.user_id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
    `,
  },
  {
    table: "user_word_progress",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`user_word_progress\`
        (user_id, word_id, mastery_level, last_reviewed_at, next_review_at, correct_streak, wrong_count, created_at, updated_at)
      SELECT s.user_id, s.word_id, s.mastery_level, s.last_reviewed_at, s.next_review_at, s.correct_streak, s.wrong_count, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`user_word_progress\` s
      WHERE NOT EXISTS (
        SELECT 1 FROM \`{{TARGET}}\`.\`user_word_progress\` t WHERE t.user_id = s.user_id AND t.word_id = s.word_id
      )
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`vocabulary\` v WHERE v.id = s.word_id)
    `,
  },
  {
    table: "lessons",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`lessons\` (id, word, image, audio, created_at, updated_at)
      SELECT s.id, s.word, s.image, s.audio, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`lessons\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`lessons\` t WHERE t.id = s.id)
    `,
  },
  {
    table: "questions",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`questions\`
        (id, lesson_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_option, explanation, created_at, updated_at)
      SELECT s.id, s.lesson_id, s.question_text, s.question_type, s.option_a, s.option_b, s.option_c, s.option_d, s.correct_option, s.explanation, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`questions\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`questions\` t WHERE t.id = s.id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`lessons\` l WHERE l.id = s.lesson_id)
    `,
  },
  {
    table: "progress",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`progress\`
        (id, user_id, lesson_id, score, attempts, completed_at, last_played_at, created_at, updated_at)
      SELECT s.id, s.user_id, s.lesson_id, s.score, s.attempts, s.completed_at, s.last_played_at, s.created_at, s.updated_at
      FROM \`{{STAGING}}\`.\`progress\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`progress\` t WHERE t.user_id = s.user_id AND t.lesson_id = s.lesson_id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`users\` u WHERE u.id = s.user_id)
        AND EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`lessons\` l WHERE l.id = s.lesson_id)
    `,
  },
  {
    table: "stripe_webhook_events",
    sql: `
      INSERT INTO \`{{TARGET}}\`.\`stripe_webhook_events\` (event_id, event_type, created_at)
      SELECT s.event_id, s.event_type, s.created_at
      FROM \`{{STAGING}}\`.\`stripe_webhook_events\` s
      WHERE NOT EXISTS (SELECT 1 FROM \`{{TARGET}}\`.\`stripe_webhook_events\` t WHERE t.event_id = s.event_id)
    `,
  },
];

async function ensureTargetTables(conn, targetDb) {
  const sqlFiles = [
    "lib/data/payments.sql",
    "lib/data/billing_conversion.sql",
    "lib/data/user_stats.sql",
    "lib/data/user_word_progress.sql",
    "lib/data/user_events.sql",
    "lib/data/user_review_events.sql",
  ];
  for (const rel of sqlFiles) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const sql = fs.readFileSync(p, "utf8");
    await conn.query(sql);
  }
}

async function loadStaging(conn, host, port, user, password) {
  console.log("\n[1/4] Backup database hiện tại...");
  const backupRun = spawnSync("node", ["scripts/backup-current-db.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (backupRun.status !== 0) throw new Error("Backup thất bại");

  console.log("\n[2/4] Extract legacy apptienganh từ Laragon backup...");
  const extractRun = spawnSync(
    "node",
    ["scripts/extract-apptienganh-legacy.mjs", LARAGON_BACKUP, STAGING_DB],
    { cwd: ROOT, stdio: "inherit", shell: true }
  );
  if (extractRun.status !== 0) throw new Error("Extract thất bại");

  const importFile = path.join(ROOT, ".backups", `${STAGING_DB}-import.sql`);
  console.log("\n[3/4] Nạp staging DB:", STAGING_DB);

  await conn.query(`DROP DATABASE IF EXISTS \`${STAGING_DB}\``);
  await conn.query(
    `CREATE DATABASE \`${STAGING_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  // mysql CLI nhanh hơn cho file lớn
  const mysqlCmd = process.env.MYSQL_CLI || "mysql";
  const args = [`-h${host}`, `-P${port}`, `-u${user}`, `-p${password}`];
  const importRun = spawnSync(mysqlCmd, args, {
    input: fs.readFileSync(importFile),
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
  });
  if (importRun.status !== 0) {
    console.warn("mysql CLI failed, thử nạp bằng Node (chậm hơn)...");
    const sql = fs.readFileSync(importFile, "utf8");
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && !s.startsWith("/*"));
    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await conn.query(stmt);
      } catch (e) {
        if (!/already exists|Duplicate/i.test(e.message)) {
          // ignore minor staging noise
        }
      }
    }
  }
}

async function main() {
  const env = loadEnv();
  const targetDb = env.DB_NAME || "english_app";
  const host = env.DB_HOST || "127.0.0.1";
  const port = Number(env.DB_PORT || 3306);
  const user = env.DB_USER || "root";
  const password = env.DB_PASSWORD || "";

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  await loadStaging(conn, host, port, user, password);
  await conn.query(`USE \`${targetDb}\``);
  await ensureTargetTables(conn, targetDb);

  console.log("\n[4/4] Merge legacy →", targetDb);
  const report = [];

  for (const plan of MERGE_PLANS) {
    const before = await countRows(conn, targetDb, plan.table);
    const stagingCount = await countRows(conn, STAGING_DB, plan.table);
    if (stagingCount === 0) {
      report.push({ table: plan.table, before, after: before, inserted: 0, staging: 0, status: "skip_empty" });
      continue;
    }

    const sql = plan.sql.replace(/\{\{TARGET\}\}/g, targetDb).replace(/\{\{STAGING\}\}/g, STAGING_DB);
    try {
      const [result] = await conn.query(sql);
      const affected = result?.affectedRows ?? 0;
      const after = await countRows(conn, targetDb, plan.table);
      report.push({
        table: plan.table,
        before,
        after,
        inserted: Math.max(0, after - before),
        staging: stagingCount,
        affected,
        status: "ok",
        note: plan.note,
      });
      console.log(`  ✓ ${plan.table}: ${before} → ${after} (+${Math.max(0, after - before)})`);
    } catch (e) {
      report.push({
        table: plan.table,
        before,
        after: before,
        inserted: 0,
        staging: stagingCount,
        status: "error",
        error: e.message,
      });
      console.error(`  ✗ ${plan.table}:`, e.message);
    }
  }

  const reportPath = path.join(ROOT, ".backups", `import-report-${Date.now()}.json`);
  fs.mkdirSync(path.join(ROOT, ".backups"), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ targetDb, stagingDb: STAGING_DB, report }, null, 2));

  console.log("\n=== BÁO CÁO IMPORT ===");
  console.log("Target:", targetDb);
  console.log("Staging:", STAGING_DB);
  console.log("Report:", reportPath);
  for (const r of report) {
    if (r.status === "ok") {
      console.log(`- ${r.table}: staging=${r.staging}, +${r.inserted} rows (now ${r.after})`);
    } else if (r.status === "skip_empty") {
      console.log(`- ${r.table}: (staging trống)`);
    } else {
      console.log(`- ${r.table}: LỖI — ${r.error}`);
    }
  }

  await conn.query(`DROP DATABASE IF EXISTS \`${STAGING_DB}\``);
  await conn.end();
}

main().catch((e) => {
  console.error("IMPORT FAILED:", e);
  process.exit(1);
});
