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

function extractEnglishTokens(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z]{3,}/g) || []))];
}

function hasEnglishFromSource(sourceSentence, viSentence) {
  const srcTokens = extractEnglishTokens(sourceSentence).filter(
    (w) => !["the", "and", "for", "with", "this", "that"].includes(w)
  );
  if (srcTokens.length === 0) return false;
  const vi = String(viSentence || "").toLowerCase();
  return srcTokens.some((w) => new RegExp(`\\b${w}\\b`, "i").test(vi));
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
              "Translate English sentence to natural Vietnamese for kids. Return only Vietnamese sentence, no English words, no quotes.",
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
    hasEnglishFromSource(r.example_sentence, r.example_sentence_vi)
  );
  console.log(`Rows with mixed language: ${targets.length}`);
  const uniqueSentences = [...new Set(targets.map((r) => String(r.example_sentence || "").trim()))]
    .filter(Boolean);
  console.log(`Unique English sentences to translate: ${uniqueSentences.length}`);

  const cache = new Map(); // key: english sentence, value: vi translation
  let updated = 0;
  let skipped = 0;
  const concurrency = Number(process.env.SENTENCE_BACKFILL_CONCURRENCY || 16);
  let index = 0;

  async function worker() {
    while (index < uniqueSentences.length) {
      const sentence = uniqueSentences[index];
      index += 1;
      if (!sentence) {
        continue;
      }
      let vi = await translateByAI(sentence);
      if (!vi || hasEnglishFromSource(sentence, vi)) {
        vi = await translateByPublicApi(sentence);
      }
      if (vi && !hasEnglishFromSource(sentence, vi)) {
        cache.set(sentence, vi);
      } else {
        skipped += 1;
      }
      const done = cache.size + skipped;
      if (done > 0 && done % 100 === 0) {
        console.log(`Translated ${done}/${uniqueSentences.length} unique sentences...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  for (const row of targets) {
    const sentence = String(row.example_sentence || "").trim();
    const vi = cache.get(sentence) || "";
    if (!vi) {
      skipped += 1;
      continue;
    }
    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
    if (updated % 200 === 0) {
      console.log(`Updated ${updated}/${targets.length} rows...`);
    }
  }

  console.log(`Done. Updated=${updated}, skipped=${skipped}, totalTargets=${targets.length}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
