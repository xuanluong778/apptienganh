import pool from "@/lib/db";

let ensured = false;

export async function ensureUserSessionsTable(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_sessions_user_id (user_id),
      INDEX idx_user_sessions_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await pool.query("SELECT 1 FROM user_sessions LIMIT 1");
  } catch (e: any) {
    if (process.env.NODE_ENV !== "production" && Number(e?.errno) === 1932) {
      await pool.query("DROP TABLE IF EXISTS user_sessions");
      await pool.query(`
        CREATE TABLE user_sessions (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          token VARCHAR(128) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_sessions_user_id (user_id),
          INDEX idx_user_sessions_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      throw e;
    }
  }
  ensured = true;
}

