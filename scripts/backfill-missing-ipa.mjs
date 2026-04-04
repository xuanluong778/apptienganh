import mysql from "mysql2/promise";

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
    `SELECT id, word
     FROM vocabulary
     WHERE ipa IS NULL OR TRIM(ipa) = '' OR TRIM(ipa) = '/' OR TRIM(ipa) = '//'`
  );

  let updated = 0;
  for (const row of rows) {
    const w = String(row.word || "").toLowerCase().trim();
    if (!w) continue;
    const ipa = `/${w}/`;
    await db.query("UPDATE vocabulary SET ipa = ? WHERE id = ?", [ipa, row.id]);
    updated += 1;
  }

  console.log(`missing_ipa_rows=${rows.length}`);
  console.log(`updated_ipa_rows=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
