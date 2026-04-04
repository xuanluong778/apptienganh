CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount INT UNSIGNED NOT NULL,
  plan ENUM('pro', 'vip') NOT NULL,
  billing_period ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  transfer_content VARCHAR(190) NOT NULL,
  status ENUM('pending', 'user_confirmed', 'admin_confirmed', 'confirmed') NOT NULL DEFAULT 'pending',
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_payments_transfer_content (transfer_content),
  KEY idx_payments_user (user_id),
  KEY idx_payments_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
