import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import iconv from "iconv-lite";
import { buildAiImageUrl } from "../lib/ai-image-url.js";

function scoreText(text) {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const vietnameseCount = (text.match(/[ăâêôơưđáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợúùủũụứừửữựíìỉĩịýỳỷỹỵ]/gi) || []).length;
  const controlCount = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
  return vietnameseCount * 4 - replacementCount * 10 - controlCount * 8;
}

function decodeVietnameseBuffer(buffer) {
  const candidates = [
    { text: buffer.toString("utf8") },
    { text: buffer.toString("utf16le") },
    { text: iconv.decode(buffer, "windows1258") },
    { text: iconv.decode(buffer, "windows1252") },
  ];
  candidates.sort((a, b) => scoreText(b.text) - scoreText(a.text));
  return candidates[0].text;
}

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

function mapPos(rawPos) {
  const pos = String(rawPos || "").toLowerCase();
  if (pos === "n" || pos === "pl") return "noun";
  if (pos === "v") return "verb";
  if (pos === "adj") return "adjective";
  return "other";
}

function fallbackImage(word) {
  return buildAiImageUrl(word);
}

function fallbackAudio(word) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(word)}`;
}

function buildSentence(word) {
  return `I learn the word "${word}" today.`;
}

function buildQuestion(word) {
  return `What does "${word}" mean in Vietnamese?`;
}

function buildSentenceAudio(sentence) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(sentence)}`;
}

function buildSentenceIpa(sentence, ipaMap) {
  const tokens = String(sentence || "").match(/[A-Za-z']+|[^A-Za-z'\s]+/g) || [];
  const parts = tokens.map((token) => {
    if (!/^[A-Za-z']+$/.test(token)) return token;
    const normalized = token.toLowerCase();
    return ipaMap.get(normalized) || `/${normalized}/`;
  });
  return parts.join(" ").replace(/\s+([.,!?;:])/g, "$1");
}

async function parseVocabularyFromFile() {
  const filePath = path.join(process.cwd(), "1000_tu_vung_co_ban.txt");
  const rawBuffer = await fs.readFile(filePath);
  const content = decodeVietnameseBuffer(rawBuffer);
  const lines = content.split(/\r?\n/);
  const items = [];
  let current = null;
  let currentTopic = "General";
  const numberedLineRegex = /^\s*(\d+)\.\s+(.+?)\s*-\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = line.match(numberedLineRegex);
    if (numbered) {
      if (current) items.push(current);
      const headPart = numbered[2].trim();
      const posMatch = headPart.match(/\b(n|v|adj|adv|prep|pron|conj|int|aux|det|pl)\b/i);
      const ipaMatch = headPart.match(/\[(.*?)\]/);
      const ipa = ipaMatch?.[1]?.trim() || "";
      const withoutIpa = headPart.replace(/\[(.*?)\]/g, " ").replace(/\s+/g, " ").trim();
      const cleanedWord = withoutIpa
        .replace(/\s+(n|v|adj|adv|prep|pron|conj|int|aux|det|pl)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const word = cleanedWord.replace(/[^a-z' -]/g, "").trim();
      if (!word || word.length < 2) {
        current = null;
        continue;
      }
      current = {
        word: toTitleCase(word),
        ipa: ipa || `/${word}/`,
        vietnamese_meaning: numbered[3]?.trim() || "",
        part_of_speech: mapPos(posMatch?.[1]),
        example_sentence: buildSentence(word),
        question_text: buildQuestion(word),
        topic: currentTopic,
      };
      continue;
    }

    const topicMatch = line.match(/^CHỦ ĐỀ\s+\d+:\s*(.+?)(?:\(|$)/i);
    if (topicMatch) {
      const topic = topicMatch[1].trim();
      if (topic) {
        if (current) items.push(current);
        current = null;
        currentTopic = topic;
      }
      continue;
    }

    if (current && line.startsWith("→")) {
      const englishExample = line.replace(/^→\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (englishExample) current.example_sentence = englishExample;
    }
  }

  if (current) items.push(current);

  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.word.toLowerCase();
    if (!seen.has(key)) {
      deduped.push(item);
      seen.add(key);
    }
  }
  return deduped;
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const items = await parseVocabularyFromFile();
  if (!items.length) throw new Error("No vocabulary parsed from file.");

  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS question_text VARCHAR(255) NULL AFTER example_sentence");
  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS topic VARCHAR(120) NULL AFTER question_text");
  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_audio_url VARCHAR(500) NULL AFTER audio_url");
  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_ipa VARCHAR(500) NULL AFTER example_sentence");
  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS vietnamese_meaning VARCHAR(255) NULL AFTER ipa");
  await db.query("ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(20) NULL AFTER vietnamese_meaning");
  await db.query("DELETE FROM vocabulary WHERE level = 'beginner'");

  const ipaMap = new Map();
  for (const item of items) {
    const key = String(item.word || "").toLowerCase().trim();
    if (key && item.ipa) ipaMap.set(key, item.ipa);
  }

  const batchSize = 200;
  let imported = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'beginner')").join(", ");
    const sql = `INSERT INTO vocabulary
      (word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_ipa, question_text, topic, image_url, audio_url, example_audio_url, level)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
      ipa = VALUES(ipa),
      vietnamese_meaning = VALUES(vietnamese_meaning),
      part_of_speech = VALUES(part_of_speech),
      example_sentence = VALUES(example_sentence),
      example_sentence_ipa = VALUES(example_sentence_ipa),
      question_text = VALUES(question_text),
      topic = VALUES(topic),
      image_url = VALUES(image_url),
      audio_url = VALUES(audio_url),
      example_audio_url = VALUES(example_audio_url),
      updated_at = CURRENT_TIMESTAMP`;

    const params = [];
    for (const item of chunk) {
      const word = item.word.toLowerCase();
      const sentence = item.example_sentence || buildSentence(word);
      params.push(
        item.word,
        item.ipa || `/${word}/`,
        item.vietnamese_meaning || "",
        item.part_of_speech || "other",
        sentence,
        buildSentenceIpa(sentence, ipaMap),
        item.question_text || buildQuestion(word),
        item.topic || "General",
        fallbackImage(word),
        fallbackAudio(word),
        buildSentenceAudio(sentence)
      );
    }

    await db.query(sql, params);
    imported += chunk.length;
    console.log(`Imported ${imported}/${items.length}`);
  }

  const [rows] = await db.query("SELECT COUNT(*) AS total FROM vocabulary WHERE level='beginner'");
  console.log(`Done. Total beginner vocabulary: ${rows[0]?.total || 0}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
