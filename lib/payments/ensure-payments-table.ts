import pool from "@/lib/db";

async function paymentsColumnExists(column: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'payments'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [column]
  );
  return Array.isArray(rows) && (rows as { ok?: number }[]).length > 0;
}

export async function ensurePaymentsTable(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS payments (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  if (!(await paymentsColumnExists("billing_period"))) {
    await pool.query(
      `ALTER TABLE payments
       ADD COLUMN billing_period ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly'
       AFTER plan`
    );
  }

  if (!(await paymentsColumnExists("confirmed_at"))) {
    await pool.query(`ALTER TABLE payments ADD COLUMN confirmed_at DATETIME NULL AFTER status`);
  }

  try {
    await pool.query(
      `ALTER TABLE payments
       MODIFY COLUMN status ENUM('pending','user_confirmed','admin_confirmed','confirmed')
       NOT NULL DEFAULT 'pending'`
    );
  } catch {
    /* table may already match */
  }
}
