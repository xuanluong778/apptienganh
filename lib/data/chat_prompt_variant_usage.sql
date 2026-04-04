-- Per-row log when getPrompt / getPromptForAiRoute selects V1 or V2 (auto-created by lib/ai/experiments/chat-prompt-ab.ts)
CREATE TABLE IF NOT EXISTS chat_prompt_variant_usage (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  variant VARCHAR(8) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'getPrompt',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at),
  KEY idx_variant_created (variant, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
