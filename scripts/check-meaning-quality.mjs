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
  const [a] = await db.query(
    "SELECT COUNT(*) AS total FROM vocabulary WHERE CHAR_LENGTH(TRIM(word)) > 1"
  );
  const [b] = await db.query(
    `SELECT COUNT(*) AS total
     FROM vocabulary
     WHERE CHAR_LENGTH(TRIM(word)) > 1
       AND (
         vietnamese_meaning IS NULL
         OR TRIM(vietnamese_meaning) = ''
         OR LOWER(TRIM(vietnamese_meaning)) = LOWER(TRIM(word))
         OR TRIM(vietnamese_meaning) REGEXP '^[A-Za-z -]+$'
       )`
  );
  const [sample] = await db.query(
    `SELECT word, vietnamese_meaning
     FROM vocabulary
     WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) <> ''
     ORDER BY id DESC
     LIMIT 12`
  );
  const [poorRows] = await db.query(
    `SELECT id, word, vietnamese_meaning
     FROM vocabulary
     WHERE CHAR_LENGTH(TRIM(word)) > 1
       AND (
         vietnamese_meaning IS NULL
         OR TRIM(vietnamese_meaning) = ''
         OR LOWER(TRIM(vietnamese_meaning)) = LOWER(TRIM(word))
         OR TRIM(vietnamese_meaning) REGEXP '^[A-Za-z -]+$'
       )
     ORDER BY id ASC
     LIMIT 30`
  );
  console.log(`total=${a[0].total}`);
  console.log(`poor_remaining=${b[0].total}`);
  console.table(sample);
  console.table(poorRows);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
