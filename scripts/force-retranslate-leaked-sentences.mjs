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

function tokens4(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z]{4,}/g) || []))];
}

function hasLeak(en, vi) {
  const enTokens = tokens4(en);
  if (!enTokens.length) return false;
  const v = String(vi || "").toLowerCase();
  return enTokens.some((t) => new RegExp(`\\b${t}\\b`, "i").test(v));
}

async function translatePublic(sentence) {
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
       AND TRIM(example_sentence_vi) <> ''`
  );
  const targets = rows.filter((r) => hasLeak(r.example_sentence, r.example_sentence_vi));
  console.log(`Target rows=${targets.length}`);

  const uniqueSentences = [...new Set(targets.map((r) => String(r.example_sentence || "").trim()))]
    .filter(Boolean);
  const cache = new Map();
  const concurrency = Number(process.env.SENTENCE_BACKFILL_CONCURRENCY || 20);
  let i = 0;
  let done = 0;

  async function worker() {
    while (i < uniqueSentences.length) {
      const s = uniqueSentences[i];
      i += 1;
      const vi = await translatePublic(s);
      if (vi) cache.set(s, vi);
      done += 1;
      if (done % 200 === 0) console.log(`Translated ${done}/${uniqueSentences.length}...`);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  let updated = 0;
  for (const row of targets) {
    const s = String(row.example_sentence || "").trim();
    const vi = cache.get(s) || "";
    if (!vi) continue;
    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
  }
  console.log(`Updated rows=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
