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

async function translateByAI(sentence) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Translate English sentence to natural Vietnamese for kids. Return only Vietnamese translation, no quotes.",
          },
          { role: "user", content: sentence },
        ],
      }),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return String(json?.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

async function translateByPublicApi(sentence) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      sentence
    )}&langpair=en|vi`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const json = await res.json();
    return String(json?.responseData?.translatedText || "").trim();
  } catch {
    return "";
  }
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT id, example_sentence
     FROM vocabulary
     WHERE example_sentence IS NOT NULL
       AND TRIM(example_sentence) <> ''
       AND (
         example_sentence_vi IS NULL
         OR TRIM(example_sentence_vi) = ''
         OR example_sentence_vi LIKE 'Từ "% xuất hiện trong câu này.%'
         OR example_sentence_vi LIKE 'Ví dụ với từ "%'
         OR example_sentence_vi LIKE 'Câu ví dụ tiếng Anh:%'
         OR example_sentence_vi LIKE 'Câu này nói rằng %'
         OR example_sentence_vi LIKE 'Câu ví dụ về %'
       )
     ORDER BY id ASC`
  );

  console.log(`Need fix: ${rows.length}`);
  const concurrency = Number(process.env.SENTENCE_BACKFILL_CONCURRENCY || 16);
  const cache = new Map();
  let index = 0;
  let updated = 0;

  async function worker() {
    while (index < rows.length) {
      const row = rows[index];
      index += 1;
      const sentence = String(row.example_sentence || "").trim();
      if (!sentence) continue;

      let vi = cache.get(sentence) || "";
      if (!vi) {
        vi = await translateByAI(sentence);
        if (!vi) vi = await translateByPublicApi(sentence);
        if (vi) cache.set(sentence, vi);
      }
      if (!vi) continue;

      await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
      updated += 1;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${rows.length}...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  console.log(`Done. Updated ${updated}/${rows.length}.`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
