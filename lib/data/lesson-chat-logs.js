import pool from "@/lib/db";

export async function loadRecentHistoryFromDb(userId, limit = 6) {
  if (!userId) return [];
  const [rows] = await pool.query(
    `SELECT message, ai_reply
     FROM lesson_chat_logs
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [userId, limit]
  );
  const merged = [];
  for (const row of rows.reverse()) {
    const userMsg = String(row.message || "").trim();
    const aiMsg = String(row.ai_reply || "").trim();
    if (userMsg) merged.push({ role: "user", content: userMsg });
    if (aiMsg) merged.push({ role: "assistant", content: aiMsg.split("\n")[0] });
  }
  return merged.slice(-10);
}

export async function ensureChatLogTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS lesson_chat_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'text',
      message TEXT NOT NULL,
      ai_reply TEXT NOT NULL,
      spoken_text TEXT NULL,
      pronunciation_score INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_created (user_id, created_at),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function insertLessonChatLog({
  userId,
  source,
  message,
  composedReply,
  spokenText,
  pronunciationScore,
}) {
  await ensureChatLogTable();
  await pool.query(
    `INSERT INTO lesson_chat_logs
      (user_id, source, message, ai_reply, spoken_text, pronunciation_score)
     VALUES (?, ?, ?, ?, ?, ?)`
  , [userId, source, message, composedReply, spokenText, pronunciationScore]);
}
