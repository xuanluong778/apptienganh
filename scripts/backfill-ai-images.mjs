import mysql from "mysql2/promise";
import { buildAiImageUrl } from "../lib/ai-image-url.js";

function getConfig() {
  if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
    };
  }
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "english_app",
  };
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT id, word, topic
     FROM vocabulary
     WHERE word IS NOT NULL AND TRIM(word) <> ''
     ORDER BY id ASC`
  );

  let updated = 0;
  for (const row of rows) {
    const imageUrl = buildAiImageUrl(row.word, row.topic);
    await db.query("UPDATE vocabulary SET image_url = ? WHERE id = ?", [imageUrl, row.id]);
    updated += 1;
    if (updated % 500 === 0) {
      console.log(`Updated ${updated}/${rows.length} images...`);
    }
  }

  console.log(`Done. Updated AI image URLs for ${updated} vocabulary items.`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
