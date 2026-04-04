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
    `SELECT word, example_sentence, example_sentence_vi
     FROM vocabulary
     WHERE LOWER(example_sentence_vi) LIKE '%expensive%'
        OR LOWER(example_sentence_vi) LIKE '%works%'
        OR LOWER(example_sentence_vi) LIKE '%hard%'
     LIMIT 20`
  );
  console.log(`remaining_key_leaks=${rows.length}`);
  console.table(rows);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
