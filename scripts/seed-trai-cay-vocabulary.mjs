/**
 * Import từ vựng trái cây từ trai-cay.txt (bảng markdown) vào MySQL.
 * Chủ đề (topic) tiếng Anh: Fruit — hiển thị trong /vocabulary và API topics.
 *
 * Chạy: node --env-file=.env.local scripts/seed-trai-cay-vocabulary.mjs
 * hoặc: npm run seed:vocab:fruit
 */

import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

/** Hiển thị song ngữ để lọc theo "trái" / "fruit" đều ra. */
const TOPIC = "Fruit · Trái cây";
const SOURCE_FILE = "trai-cay.txt";
const LEVEL = "beginner";

function getConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "apptienganh",
  };
}

function buildSentence(word) {
  return `I learn the word "${word}" in the ${TOPIC} topic.`;
}

function buildSentenceVi(word, meaning) {
  if (meaning) {
    return `Hôm nay em học từ "${word}", nghĩa là "${meaning}".`;
  }
  return `Hôm nay em học từ "${word}".`;
}

function buildQuestion(word) {
  return `What does "${word}" mean in Vietnamese?`;
}

function fallbackImage(word) {
  const seed = encodeURIComponent(String(word).toLowerCase().slice(0, 80));
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function fallbackAudio(word) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(word)}`;
}

function buildSentenceAudio(sentence) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(sentence)}`;
}

function buildSentenceIpa(sentence, ipaMap) {
  const tokens = String(sentence || "").match(/[A-Za-z']+|[^A-Za-z'\s]+/g) || [];
  const parts = tokens.map((token) => {
    if (!/^[A-Za-z']+$/.test(token)) {
      return token;
    }
    const normalized = token.toLowerCase();
    return ipaMap.get(normalized) || `/${normalized}/`;
  });
  return parts.join(" ").replace(/\s+([.,!?;:])/g, "$1");
}

function parseMarkdownTable(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 4) continue;
    if (!/^\d+$/.test(cells[0])) continue;
    const word = cells[1].replace(/\s+/g, " ").trim();
    const ipaCell = cells[2].replace(/\s+/g, " ").trim();
    const meaning = cells[3].replace(/\s+/g, " ").trim();
    if (!word || !meaning) continue;
    if (/^Từ vựng$/i.test(word) || /^Phiên âm$/i.test(word) || /^Nghĩa$/i.test(word)) continue;
    let ipa = ipaCell;
    if (!ipa.startsWith("/")) ipa = `/${ipa.replace(/^\/+|\/+$/g, "")}/`;
    rows.push({ word: word.slice(0, 120), ipa, meaning });
  }
  return rows;
}

function buildChunkInsertQuery(chunkSize) {
  const placeholders = Array(chunkSize)
    .fill("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .join(", ");
  return `
    INSERT INTO vocabulary
      (word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_vi, example_sentence_ipa, question_text, topic, image_url, audio_url, example_audio_url, level)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      ipa = VALUES(ipa),
      vietnamese_meaning = VALUES(vietnamese_meaning),
      part_of_speech = VALUES(part_of_speech),
      example_sentence = VALUES(example_sentence),
      example_sentence_vi = VALUES(example_sentence_vi),
      example_sentence_ipa = VALUES(example_sentence_ipa),
      question_text = VALUES(question_text),
      topic = VALUES(topic),
      image_url = VALUES(image_url),
      audio_url = VALUES(audio_url),
      example_audio_url = VALUES(example_audio_url),
      updated_at = CURRENT_TIMESTAMP
  `;
}

async function main() {
  const filePath = path.join(process.cwd(), SOURCE_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`[seed-trai-cay] Không tìm thấy ${SOURCE_FILE} tại ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const items = parseMarkdownTable(content);
  if (!items.length) {
    console.error("[seed-trai-cay] Không parse được dòng nào từ markdown.");
    process.exit(1);
  }

  const ipaMap = new Map();
  for (const it of items) {
    const key = it.word.toLowerCase();
    if (key && it.ipa) ipaMap.set(key, it.ipa);
  }

  const conn = await mysql.createConnection(getConfig());
  const batchSize = 100;
  let done = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const params = [];
    for (const it of chunk) {
      const w = it.word;
      const lower = w.toLowerCase();
      const ex = buildSentence(w);
      params.push(
        w,
        it.ipa || `/${lower}/`,
        it.meaning,
        "noun",
        ex,
        buildSentenceVi(w, it.meaning),
        buildSentenceIpa(ex, ipaMap),
        buildQuestion(w),
        TOPIC,
        fallbackImage(w),
        fallbackAudio(w),
        buildSentenceAudio(ex),
        LEVEL
      );
    }
    const q = buildChunkInsertQuery(chunk.length);
    await conn.query(q, params);
    done += chunk.length;
  }

  await conn.end();
  console.log(`[seed-trai-cay] Đã upsert ${done} mục vào topic "${TOPIC}" (level=${LEVEL}).`);
}

main().catch((e) => {
  console.error("[seed-trai-cay]", e?.message || e);
  process.exit(1);
});
