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
  const [[a]] = await db.query(
    "SELECT COUNT(*) AS total FROM vocabulary WHERE example_sentence LIKE 'I learn the word \"%\" in this topic.%' OR example_sentence LIKE 'I learn the word \"%\" today.%'"
  );
  const [[b]] = await db.query(
    "SELECT COUNT(*) AS total FROM vocabulary WHERE example_sentence_ipa IS NULL OR TRIM(example_sentence_ipa) = '' OR TRIM(example_sentence_ipa) = '/.../'"
  );
  const [sample] = await db.query(
    "SELECT word, part_of_speech, example_sentence, example_sentence_vi, example_sentence_ipa FROM vocabulary ORDER BY id DESC LIMIT 6"
  );
  console.log(`remaining_template_sentences=${a.total}`);
  console.log(`remaining_missing_sentence_ipa=${b.total}`);
  console.table(sample);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
