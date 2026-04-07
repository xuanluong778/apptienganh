import pool from "@/lib/db";

let cache = null;

/**
 * Resolve real column names: supports `meaning` / `pronunciation` or legacy `vietnamese_meaning` / `ipa`.
 */
export async function getVocabularyQuizColumns() {
  if (cache) {
    return cache;
  }
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    ["vocabulary"]
  );
  const names = new Set(rows.map((r) => String(r.n || "")));
  const meaning = names.has("meaning")
    ? "meaning"
    : names.has("vietnamese_meaning")
      ? "vietnamese_meaning"
      : null;
  const pronunciation = names.has("pronunciation")
    ? "pronunciation"
    : names.has("ipa")
      ? "ipa"
      : null;
  if (!meaning) {
    throw new Error("vocabulary table must have `meaning` or `vietnamese_meaning`");
  }
  cache = { meaning, pronunciation };
  return cache;
}

export function clearVocabularyQuizColumnsCache() {
  cache = null;
}
