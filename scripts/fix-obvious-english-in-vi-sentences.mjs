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

function tokens4(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z]{5,}/g) || []))];
}

function hasObviousEnglishLeak(en, vi) {
  const enTokens = tokens4(en);
  if (!enTokens.length) return false;
  const viLower = String(vi || "").toLowerCase();
  return enTokens.some((w) => new RegExp(`\\b${w}\\b`, "i").test(viLower));
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
              "Translate English sentence to natural Vietnamese for kids. Return only Vietnamese sentence, no English words.",
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
    `SELECT id, example_sentence, example_sentence_vi
     FROM vocabulary
     WHERE example_sentence IS NOT NULL
       AND TRIM(example_sentence) <> ''
       AND example_sentence_vi IS NOT NULL
       AND TRIM(example_sentence_vi) <> ''
     ORDER BY id ASC`
  );

  const targets = rows.filter((r) =>
    hasObviousEnglishLeak(r.example_sentence, r.example_sentence_vi)
  );
  console.log(`Obvious English leak rows: ${targets.length}`);

  const uniqueSentences = [...new Set(targets.map((r) => String(r.example_sentence || "").trim()))]
    .filter(Boolean);
  console.log(`Unique source sentences: ${uniqueSentences.length}`);

  const cache = new Map();
  const concurrency = Number(process.env.SENTENCE_BACKFILL_CONCURRENCY || 16);
  let idx = 0;
  let translated = 0;

  async function worker() {
    while (idx < uniqueSentences.length) {
      const sentence = uniqueSentences[idx];
      idx += 1;
      let vi = await translateByAI(sentence);
      if (!vi || hasObviousEnglishLeak(sentence, vi)) {
        vi = await translateByPublicApi(sentence);
      }
      if (vi && !hasObviousEnglishLeak(sentence, vi)) {
        cache.set(sentence, vi);
      }
      translated += 1;
      if (translated % 200 === 0) {
        console.log(`Translated ${translated}/${uniqueSentences.length}...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  let updated = 0;
  for (const row of targets) {
    const vi = cache.get(String(row.example_sentence || "").trim()) || "";
    if (!vi) continue;
    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
    if (updated % 50 === 0) {
      console.log(`Updated ${updated}/${targets.length}...`);
    }
  }
  console.log(`Done. Updated ${updated}/${targets.length}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
