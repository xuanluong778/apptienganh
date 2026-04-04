import mysql from "mysql2/promise";
import { buildAiImageUrl } from "../lib/ai-image-url.js";

const WORD_SOURCE_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt";

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

function toTitleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function fallbackImage(word) {
  return buildAiImageUrl(word);
}

function fallbackAudio(word) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(
    word
  )}`;
}

function buildExampleSentence(word) {
  return `I learn the word "${word}" in this topic.`;
}

function buildQuestion(word) {
  return `What does "${word}" mean?`;
}

function buildSentenceVi(word) {
  return `Em học từ "${word}" trong chủ đề này.`;
}

async function fetchWords(limit = 20000) {
  const response = await fetch(WORD_SOURCE_URL);
  if (!response.ok) {
    throw new Error("Cannot download word source list.");
  }
  const text = await response.text();
  return text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length > 1)
    .slice(0, limit);
}

async function ensureColumns(connection) {
  await connection.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS topic VARCHAR(120) NULL AFTER question_text"
  );
  await connection.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa"
  );
  await connection.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(20) NULL AFTER vietnamese_meaning"
  );
  await connection.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_vi VARCHAR(500) NULL AFTER example_sentence"
  );
}

async function main() {
  const targetMin = Number(process.env.TOPUP_TOPIC_TARGET_MIN || 150);
  const targetMax = Number(process.env.TOPUP_TOPIC_TARGET_MAX || 200);
  const target = Math.max(1, Math.min(targetMin, targetMax));

  const connection = await mysql.createConnection(getConfig());
  await ensureColumns(connection);

  const [topicRows] = await connection.query(
    `SELECT topic, COUNT(*) AS total
     FROM vocabulary
     WHERE topic IS NOT NULL AND topic <> ''
     GROUP BY topic
     ORDER BY topic ASC`
  );

  if (!topicRows.length) {
    console.log("No topic found in vocabulary table.");
    await connection.end();
    return;
  }

  const [wordRows] = await connection.query("SELECT LOWER(word) AS word FROM vocabulary");
  const existingWords = new Set(
    wordRows.map((r) => String(r.word || "").trim().toLowerCase()).filter(Boolean)
  );

  const sourceWords = await fetchWords(20000);
  let cursor = 0;
  let totalInserted = 0;

  for (const row of topicRows) {
    const topic = String(row.topic || "").trim();
    const currentTotal = Number(row.total || 0);
    if (!topic) continue;

    if (currentTotal >= target) {
      console.log(`Skip "${topic}" (${currentTotal}/${target})`);
      continue;
    }

    const need = target - currentTotal;
    let insertedForTopic = 0;

    for (let i = 0; i < need; i += 1) {
      while (cursor < sourceWords.length && existingWords.has(sourceWords[cursor])) {
        cursor += 1;
      }
      if (cursor >= sourceWords.length) {
        break;
      }

      const word = sourceWords[cursor];
      cursor += 1;
      existingWords.add(word);

      const titleWord = toTitleCase(word);
      const sentence = buildExampleSentence(word);

      await connection.query(
        `INSERT INTO vocabulary
         (word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_vi, question_text, topic, image_url, audio_url, level)
         VALUES (?, '', ?, 'noun', ?, ?, ?, ?, ?, ?, 'beginner')`,
        [
          titleWord,
          word,
          sentence,
          buildSentenceVi(word),
          buildQuestion(word),
          topic,
          fallbackImage(word),
          fallbackAudio(word),
        ]
      );

      insertedForTopic += 1;
      totalInserted += 1;
    }

    console.log(`Topup "${topic}": +${insertedForTopic} (now ~${currentTotal + insertedForTopic})`);
  }

  console.log(`Done. Inserted ${totalInserted} new vocabulary rows.`);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
