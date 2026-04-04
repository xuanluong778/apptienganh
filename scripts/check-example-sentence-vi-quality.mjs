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
  const [bad] = await db.query(
    `SELECT COUNT(*) AS total
     FROM vocabulary
     WHERE example_sentence_vi LIKE 'Từ "% xuất hiện trong câu này.%'
        OR example_sentence_vi LIKE 'Ví dụ với từ "%'
        OR example_sentence_vi LIKE 'Câu ví dụ tiếng Anh:%'
        OR example_sentence_vi LIKE 'Câu này nói rằng %'
        OR example_sentence_vi LIKE 'Câu ví dụ về %'`
  );
  const [father] = await db.query(
    `SELECT word, example_sentence, example_sentence_vi
     FROM vocabulary
     WHERE LOWER(word) = 'father'
     ORDER BY id DESC
     LIMIT 5`
  );
  console.log(`bad_sentence_vi_remaining=${bad[0]?.total || 0}`);
  console.table(father);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
