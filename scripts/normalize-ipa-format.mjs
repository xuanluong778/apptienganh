import mysql from "mysql2/promise";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const MANUAL_IPA_OVERRIDES = {
  grandfather: "/ˈɡrænfɑːðər/",
  grandmother: "/ˈɡrænmʌðər/",
  father: "/ˈfɑːðər/",
  mother: "/ˈmʌðər/",
  brother: "/ˈbrʌðər/",
  sister: "/ˈsɪstər/",
};

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

function normalizeIpa(raw) {
  const original = String(raw || "").trim();
  if (!original) return "";

  let body = original.replace(/^\/+|\/+$/g, "").trim();
  if (!body) return "";

  // Remove optional sounds shown in parentheses: (d), (r), etc.
  body = body.replace(/\([^)]+\)/g, "");
  // Remove extra spaces inside IPA.
  body = body.replace(/\s+/g, "");
  // Convert uncommon alveolar approximant form to simpler classroom form.
  body = body.replace(/ɹ/g, "r");
  // Normalize duplicate stress/length marks.
  body = body.replace(/ː{2,}/g, "ː").replace(/ˈ{2,}/g, "ˈ").replace(/ˌ{2,}/g, "ˌ");
  // Remove any remaining parentheses if malformed.
  body = body.replace(/[()]/g, "");

  if (!body) return "";
  return `/${body}/`;
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    "SELECT id, word, ipa, example_sentence_ipa FROM vocabulary WHERE (ipa IS NOT NULL AND TRIM(ipa) <> '') OR (example_sentence_ipa IS NOT NULL AND TRIM(example_sentence_ipa) <> '')"
  );

  let updatedIpa = 0;
  let updatedSentenceIpa = 0;

  for (const row of rows) {
    const word = String(row.word || "").toLowerCase().trim();
    const forced = MANUAL_IPA_OVERRIDES[word] || "";
    const normalizedWordIpa = forced || normalizeIpa(row.ipa);
    const normalizedSentenceIpa = normalizeIpa(row.example_sentence_ipa);

    if (normalizedWordIpa && normalizedWordIpa !== String(row.ipa || "").trim()) {
      await db.query("UPDATE vocabulary SET ipa = ? WHERE id = ?", [normalizedWordIpa, row.id]);
      updatedIpa += 1;
    }

    if (
      normalizedSentenceIpa &&
      normalizedSentenceIpa !== String(row.example_sentence_ipa || "").trim()
    ) {
      await db.query("UPDATE vocabulary SET example_sentence_ipa = ? WHERE id = ?", [
        normalizedSentenceIpa,
        row.id,
      ]);
      updatedSentenceIpa += 1;
    }
  }

  console.log(`scanned_rows=${rows.length}`);
  console.log(`updated_ipa=${updatedIpa}`);
  console.log(`updated_example_sentence_ipa=${updatedSentenceIpa}`);

  const [sample] = await db.query(
    "SELECT id, word, ipa FROM vocabulary WHERE LOWER(word) IN ('grandfather','grandmother','father','mother','brother','sister') ORDER BY word"
  );
  console.log("sample_family_ipa=", sample);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
