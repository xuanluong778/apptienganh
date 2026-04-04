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

function isPoorMeaning(word, meaning) {
  const w = String(word || "").trim().toLowerCase();
  const m = String(meaning || "").trim();
  if (!m) return true;
  if (m.toLowerCase() === w) return true;
  if (/^[a-z\s\-]+$/i.test(m)) return true;
  if (m.startsWith("từ tiếng Anh:")) return true;
  return false;
}

function normalizeMeaning(text) {
  let out = String(text || "").trim();
  out = out.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  out = out.replace(/\s+/g, " ");
  out = out.replace(/[.。]+$/g, "").trim();
  return out;
}

function classifySpecialWord(wordRaw) {
  const raw = String(wordRaw || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (/^[A-Z0-9]{2,8}$/.test(raw) || /^[A-Z]{2,6}s$/.test(raw)) {
    return `từ viết tắt: ${raw}`;
  }

  if (/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)*$/.test(raw)) {
    return `tên riêng: ${raw}`;
  }

  const technicalSuffixes = [
    "tion",
    "sion",
    "ology",
    "graphy",
    "phobia",
    "scope",
    "metry",
    "nomy",
    "tronics",
    "genics",
    "istics",
    "cracy",
    "ism",
  ];
  if (lower.length >= 8 && technicalSuffixes.some((s) => lower.endsWith(s))) {
    return `thuật ngữ: ${lower}`;
  }

  return "";
}

async function translateMeaningByAI(word) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return "";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "Translate one English vocabulary word into natural Vietnamese meaning for kids. Return only short Vietnamese meaning (1-6 words), no explanation, no quotes.",
          },
          { role: "user", content: word },
        ],
      }),
    });
    if (!response.ok) return "";
    const json = await response.json();
    return normalizeMeaning(json?.choices?.[0]?.message?.content || "");
  } catch {
    return "";
  }
}

async function translateMeaningByPublicApi(word) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      word
    )}&langpair=en|vi`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return "";
    const json = await response.json();
    return normalizeMeaning(json?.responseData?.translatedText || "");
  } catch {
    return "";
  }
}

async function translateMeaning(word) {
  let vi = await translateMeaningByAI(word);
  if (vi) return vi;
  vi = await translateMeaningByPublicApi(word);
  return vi;
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  await db.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa"
  );

  const [rows] = await db.query(
    `SELECT id, word, vietnamese_meaning
     FROM vocabulary
     WHERE CHAR_LENGTH(TRIM(word)) > 1
     ORDER BY id ASC`
  );

  const targets = rows.filter((r) => isPoorMeaning(r.word, r.vietnamese_meaning));
  console.log(`Total rows: ${rows.length}`);
  console.log(`Need backfill: ${targets.length}`);

  let updated = 0;
  let skipped = 0;
  const cache = new Map();
  const specialMap = new Map();
  const uniqueWords = [...new Set(targets.map((r) => String(r.word || "").trim().toLowerCase()))];
  console.log(`Unique words to translate: ${uniqueWords.length}`);

  for (const row of targets) {
    const key = String(row.word || "").trim().toLowerCase();
    if (!key || specialMap.has(key)) continue;
    const special = classifySpecialWord(row.word);
    if (special) {
      specialMap.set(key, special);
    }
  }
  const concurrency = Number(process.env.MEANING_BACKFILL_CONCURRENCY || 12);
  let index = 0;
  let translatedWordCount = 0;

  async function worker() {
    while (index < uniqueWords.length) {
      const word = uniqueWords[index];
      index += 1;
      if (!word) continue;
      const specialMeaning = specialMap.get(word) || "";
      if (specialMeaning) {
        cache.set(word, specialMeaning);
        translatedWordCount += 1;
        if (translatedWordCount % 200 === 0) {
          console.log(`Translated ${translatedWordCount}/${uniqueWords.length} words...`);
        }
        continue;
      }
      const vi = await translateMeaning(word);
      if (vi) {
        cache.set(word, vi);
      }
      translatedWordCount += 1;
      if (translatedWordCount % 200 === 0) {
        console.log(`Translated ${translatedWordCount}/${uniqueWords.length} words...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  for (const row of targets) {
    const word = String(row.word || "").trim().toLowerCase();
    const vi = cache.get(word) || "";
    if (!vi) {
      skipped += 1;
      continue;
    }
    await db.query("UPDATE vocabulary SET vietnamese_meaning = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
    if (updated > 0 && updated % 200 === 0) {
      console.log(`Updated ${updated}/${targets.length} rows...`);
    }
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
