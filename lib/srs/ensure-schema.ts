import pool from "@/lib/db";

let ensured = false;

export async function ensureUserWordProgressTable(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_word_progress (
      user_id BIGINT UNSIGNED NOT NULL,
      word_id BIGINT UNSIGNED NOT NULL,
      mastery_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
      last_reviewed_at DATETIME NULL,
      next_review_at DATETIME NULL,
      correct_streak INT NOT NULL DEFAULT 0,
      wrong_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, word_id),
      CONSTRAINT fk_user_word_progress_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_user_word_progress_word FOREIGN KEY (word_id) REFERENCES vocabulary(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_user_word_progress_next (user_id, next_review_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ensured = true;
}

