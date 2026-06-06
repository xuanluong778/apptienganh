-- Idempotency log for review result submissions (SRS + XP)
-- Each attempt_id should be unique per user.

CREATE TABLE IF NOT EXISTS user_review_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_id VARCHAR(128) NOT NULL,
  word_id BIGINT UNSIGNED NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  xp_delta INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_review_events_attempt (user_id, attempt_id),
  INDEX idx_user_review_events_user_created (user_id, created_at),
  CONSTRAINT fk_user_review_events_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_review_events_word FOREIGN KEY (word_id) REFERENCES vocabulary(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

