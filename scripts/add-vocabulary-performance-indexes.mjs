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

async function addIndexIfMissing(db, tableName, indexName, columnsSql) {
  const [rows] = await db.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );
  if (rows.length > 0) {
    console.log(`skip ${indexName} (already exists)`);
    return;
  }
  await db.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsSql})`);
  console.log(`created ${indexName}`);
}

async function main() {
  const db = await mysql.createConnection(getConfig());

  await addIndexIfMissing(
    db,
    "vocabulary",
    "idx_vocab_level_topic_pos",
    "level, topic, part_of_speech"
  );
  await addIndexIfMissing(db, "vocabulary", "idx_vocab_level_topic", "level, topic");
  await addIndexIfMissing(db, "vocabulary", "idx_vocab_level_pos", "level, part_of_speech");

  const [explainRows] = await db.query(
    `EXPLAIN SELECT id, word
     FROM vocabulary
     WHERE level = ?
       AND (? = '' OR topic = ?)
       AND (? = '' OR part_of_speech = ?)
     ORDER BY id ASC
     LIMIT 60 OFFSET 0`,
    ["beginner", "", "", "", ""]
  );
  console.log("explain sample:");
  console.table(explainRows);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
