import pool from "@/lib/db";

export async function ensureUserProfileColumns(): Promise<void> {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL`);
  } catch {
    /* exists */
  }
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN date_of_birth DATE NULL`);
  } catch {
    /* exists */
  }
}
