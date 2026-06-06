import pool from "@/lib/db";

let ensured = false;

export async function ensureAppSettingsTable(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(191) NOT NULL PRIMARY KEY,
      setting_value LONGTEXT NULL,
      is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await pool.query("SELECT 1 FROM app_settings LIMIT 1");
  } catch (e: any) {
    if (process.env.NODE_ENV !== "production" && Number(e?.errno) === 1932) {
      await pool.query("DROP TABLE IF EXISTS app_settings");
      await pool.query(`
        CREATE TABLE app_settings (
          setting_key VARCHAR(191) NOT NULL PRIMARY KEY,
          setting_value LONGTEXT NULL,
          is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      throw e;
    }
  }
  ensured = true;
}
