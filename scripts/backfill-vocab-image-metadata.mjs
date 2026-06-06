import mysql from "mysql2/promise";
import { buildVocabularyImageMetadata } from "../lib/vocabulary/image-prompt.js";

const BATCH = 100;

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "english_app",
  });

  const [cols] = await pool.query("SHOW COLUMNS FROM vocabulary");
  const colSet = new Set(cols.map((c) => c.Field));

  for (const col of ["semantic_hint", "image_prompt", "image_style", "image_status"]) {
    if (!colSet.has(col)) {
      const type =
        col === "image_prompt"
          ? "TEXT"
          : col === "image_status"
          ? "VARCHAR(20) DEFAULT 'pending'"
          : col === "image_style"
          ? "VARCHAR(80)"
          : "VARCHAR(500)";
      await pool.query(`ALTER TABLE vocabulary ADD COLUMN ${col} ${type} NULL`);
      colSet.add(col);
    }
  }

  let offset = 0;
  let updated = 0;

  while (true) {
    const [rows] = await pool.query(
      `SELECT id, word, vietnamese_meaning, part_of_speech, topic, example_sentence, image_url, image_status
       FROM vocabulary
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [BATCH, offset]
    );
    if (!rows.length) break;

    for (const row of rows) {
      const status = String(row.image_status || "").toLowerCase();
      if (status === "approved") continue;

      const meta = buildVocabularyImageMetadata(row);
      await pool.query(
        `UPDATE vocabulary
         SET semantic_hint = ?, image_prompt = ?, image_style = ?, image_url = ?, image_status = ?
         WHERE id = ?`,
        [meta.semantic_hint, meta.image_prompt, meta.image_style, meta.image_url, "pending", row.id]
      );
      updated += 1;
    }

    offset += rows.length;
    console.log(`Processed ${offset} rows…`);
  }

  console.log(`Done. Updated ${updated} vocabulary images with semantic metadata.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
