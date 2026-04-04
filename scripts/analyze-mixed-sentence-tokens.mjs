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

function tokens5(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z]{5,}/g) || []))];
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT example_sentence, example_sentence_vi
     FROM vocabulary
     WHERE example_sentence IS NOT NULL
       AND TRIM(example_sentence) <> ''
       AND example_sentence_vi IS NOT NULL
       AND TRIM(example_sentence_vi) <> ''`
  );

  const freq = new Map();
  let rowCount = 0;
  for (const r of rows) {
    const enTokens = tokens5(r.example_sentence);
    if (!enTokens.length) continue;
    const vi = String(r.example_sentence_vi || "").toLowerCase();
    let hasLeak = false;
    for (const t of enTokens) {
      if (new RegExp(`\\b${t}\\b`, "i").test(vi)) {
        freq.set(t, (freq.get(t) || 0) + 1);
        hasLeak = true;
      }
    }
    if (hasLeak) rowCount += 1;
  }

  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  console.log(`rows_with_obvious_leak=${rowCount}`);
  console.table(top.map(([token, count]) => ({ token, count })));
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
