-- OTP login (email / SMS). `code` stores SHA-256 hex of the 6-digit OTP (never store plaintext).
CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  code VARCHAR(64) NOT NULL COMMENT 'SHA-256 hex of OTP',
  type ENUM('email', 'sms') NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_otp_email (email),
  KEY idx_otp_phone (phone),
  KEY idx_otp_expires (expires_at),
  KEY idx_otp_email_created (email, created_at),
  KEY idx_otp_phone_created (phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
