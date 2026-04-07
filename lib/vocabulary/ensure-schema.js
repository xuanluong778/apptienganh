import { clearVocabularyTableColumnCache } from "@/lib/vocabulary/vocabulary-columns";

/**
 * Đồng bộ cột bảng vocabulary với API (DB cũ / import tay thường thiếu cột → SELECT lỗi).
 * Chạy tối đa một lần mỗi process; ALTER IF NOT EXISTS là no-op khi đã có.
 */
let ensured = false;

/* Thứ tự khớp app/api/admin/import-vocabulary/route.js */
const ALTER_STATEMENTS = [
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS question_text VARCHAR(255) NULL AFTER example_sentence",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS topic VARCHAR(120) NULL AFTER question_text",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_audio_url VARCHAR(500) NULL AFTER audio_url",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_ipa VARCHAR(500) NULL AFTER example_sentence",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_vi VARCHAR(500) NULL AFTER example_sentence",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa",
  "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(20) NULL AFTER vietnamese_meaning",
];

export async function ensureVocabularySchema(pool) {
  if (ensured) return;
  for (const sql of ALTER_STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (_e) {
      /* MySQL cũ không hỗ trợ IF NOT EXISTS / cột đã tồn tại — bỏ qua, API dùng INFORMATION_SCHEMA */
    }
  }
  ensured = true;
  clearVocabularyTableColumnCache();
}
