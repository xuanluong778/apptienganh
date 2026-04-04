-- Chat prompt A/B metrics (also auto-created by lib/ai/experiments/chat-prompt-ab.ts on first log)
CREATE TABLE IF NOT EXISTS chat_prompt_ab_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  trace_id CHAR(36) NOT NULL,
  variant ENUM('A','B') NOT NULL,
  response_length INT UNSIGNED NOT NULL DEFAULT 0,
  user_replied TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  replied_at DATETIME NULL,
  UNIQUE KEY uk_trace (trace_id),
  KEY idx_user_created (user_id, created_at),
  KEY idx_variant_replied (variant, user_replied, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example rollups:
-- Avg response length: SELECT variant, AVG(response_length) FROM chat_prompt_ab_events GROUP BY variant;
-- Reply rate: SELECT variant, AVG(user_replied) FROM chat_prompt_ab_events GROUP BY variant;
