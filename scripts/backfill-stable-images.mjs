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
  const [rows] = await db.query("SELECT id, word, topic FROM vocabulary WHERE word IS NOT NULL");
  let updated = 0;
  for (const row of rows) {
    await db.query("UPDATE vocabulary SET image_url = ? WHERE id = ?", [
      buildAiImageUrl(row.word, row.topic),
      row.id,
    ]);
    updated += 1;
    if (updated % 500 === 0) {
      console.log(`Updated ${updated}/${rows.length}...`);
    }
  }
  console.log(`Done. Stable images updated: ${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
