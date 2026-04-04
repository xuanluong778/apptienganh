-- Subscriptions + daily AI usage (also auto-created by lib/subscriptions/subscription-service.ts).
-- Trial: 15 days from signup. Upgrade: extends paid window by 30 days.

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  plan ENUM('free', 'pro', 'vip') NOT NULL DEFAULT 'free',
  trial_start_at DATETIME NOT NULL,
  trial_end_at DATETIME NOT NULL,
  subscribed_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subscriptions_user (user_id),
  KEY idx_subscriptions_expires (expires_at),
  KEY idx_subscriptions_trial_end (trial_end_at),
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  UNIQUE KEY uk_stripe_subscription (stripe_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) NOT NULL PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per user per local (DB session) date; pooled: chat + translate + grammar.
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id BIGINT UNSIGNED NOT NULL,
  usage_date DATE NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, usage_date),
  KEY idx_usage_date (usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
