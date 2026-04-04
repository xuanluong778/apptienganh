-- Billing funnel (also auto-created by lib/billing/conversion-tracking.ts)
CREATE TABLE IF NOT EXISTS billing_conversion_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(32) NOT NULL,
  metadata JSON NULL,
  stripe_checkout_session_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_event_time (user_id, event_type, created_at),
  KEY idx_event_time (event_type, created_at),
  KEY idx_stripe_session (stripe_checkout_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
