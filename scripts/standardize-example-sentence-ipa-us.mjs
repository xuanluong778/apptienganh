import mysql from "mysql2/promise";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

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

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-z']/g, "")
    .trim();
}

function normalizeIpa(raw) {
  const body = String(raw || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/\s+/g, "")
    .replace(/ɹ/g, "r")
    .replace(/[()]/g, "")
    .trim();
  return body ? `/${body}/` : "";
}

function buildSentenceIpa(sentence, ipaMap) {
  const tokens = String(sentence || "").match(/[A-Za-z']+|[^A-Za-z'\s]+/g) || [];
  const parts = tokens.map((token) => {
    if (!/^[A-Za-z']+$/.test(token)) return token;
    const key = normalizeWord(token);
    return ipaMap.get(key) || `/${key || "word"}/`;
  });
  return parts.join(" ").replace(/\s+([.,!?;:])/g, "$1");
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    "SELECT id, word, ipa, example_sentence, example_sentence_ipa FROM vocabulary WHERE word IS NOT NULL AND TRIM(word) <> ''"
  );

  const ipaMap = new Map();
  for (const row of rows) {
    const key = normalizeWord(row.word);
    const ipa = normalizeIpa(row.ipa);
    if (key && ipa) ipaMap.set(key, ipa);
  }

  let updated = 0;
  for (const row of rows) {
    const sentence = String(row.example_sentence || "").trim();
    if (!sentence) continue;
    const nextSentenceIpa = buildSentenceIpa(sentence, ipaMap);
    const prevSentenceIpa = String(row.example_sentence_ipa || "").trim();
    if (!nextSentenceIpa || nextSentenceIpa === prevSentenceIpa) continue;
    await db.query("UPDATE vocabulary SET example_sentence_ipa = ? WHERE id = ?", [
      nextSentenceIpa,
      row.id,
    ]);
    updated += 1;
  }

  console.log(`total_rows=${rows.length}`);
  console.log(`ipa_map_size=${ipaMap.size}`);
  console.log(`updated_example_sentence_ipa=${updated}`);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
