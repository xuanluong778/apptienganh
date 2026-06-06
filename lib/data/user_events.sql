-- User event log (analytics)
-- Idempotent migration: safe to run multiple times.

CREATE TABLE IF NOT EXISTS user_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  attempt_id VARCHAR(128) NULL,
  event_type VARCHAR(64) NOT NULL,
  word_id BIGINT UNSIGNED NULL,
  is_correct TINYINT(1) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_events_attempt (user_id, attempt_id, event_type),
  INDEX idx_user_events_user_created (user_id, created_at),
  INDEX idx_user_events_user_type_created (user_id, event_type, created_at),
  CONSTRAINT fk_user_events_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_events_word FOREIGN KEY (word_id) REFERENCES vocabulary(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

