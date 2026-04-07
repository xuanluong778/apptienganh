/**
 * Cột users + bảng verification — tương thích MySQL 8 (không dùng ADD COLUMN IF NOT EXISTS).
 */

let usersAuthEnsured = false;

async function usersHasPhoneColumn(pool, schemaName) {
  const [phoneRows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
     LIMIT 1`,
    [schemaName]
  );
  return phoneRows.length > 0;
}

/** Chỉ bảng users: email nullable + cột phone (cho đăng nhập SĐT). */
export async function ensureUsersAuthColumns(pool) {
  if (usersAuthEnsured) return;

  const [[dbRow]] = await pool.query("SELECT DATABASE() AS db");
  const schemaName = dbRow?.db != null ? String(dbRow.db) : "";
  if (!schemaName) {
    throw new Error(
      "MySQL has no default database (DATABASE() is null). Set DB_NAME or DATABASE_URL with database path."
    );
  }

  try {
    await pool.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
  } catch (_e) {
    /* đã đúng hoặc không được quyền */
  }

  let hasPhone = await usersHasPhoneColumn(pool, schemaName);
  if (!hasPhone) {
    try {
      await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL UNIQUE AFTER email");
    } catch (_e) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL UNIQUE");
      } catch (_e2) {
        /* không có quyền ALTER hoặc cột đã tồn tại tên khác */
      }
    }
  }

  hasPhone = await usersHasPhoneColumn(pool, schemaName);
  if (!hasPhone) {
    throw new Error(
      "Thiếu cột users.phone và không tạo được bằng ALTER. Thêm thủ công: ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL UNIQUE; (hoặc cấp quyền ALTER cho user MySQL của app)."
    );
  }

  usersAuthEnsured = true;
}

let verificationEnsured = false;

export async function ensureVerificationSchema(pool) {
  if (verificationEnsured) return;

  await ensureUsersAuthColumns(pool);

  await pool.query(
    `CREATE TABLE IF NOT EXISTS verification_codes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      otp_token VARCHAR(100) NOT NULL UNIQUE,
      contact_type VARCHAR(20) NOT NULL,
      contact_value VARCHAR(255) NOT NULL,
      code_hash VARCHAR(128) NOT NULL,
      purpose VARCHAR(30) NOT NULL DEFAULT 'register',
      attempts INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contact (contact_type, contact_value),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  verificationEnsured = true;
}
