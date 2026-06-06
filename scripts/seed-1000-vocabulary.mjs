import mysql from "mysql2/promise";

const WORD_SOURCE_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt";
const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

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

function defaultSentence(word) {
  return `I learn the word "${word}" today.`;
}

function fallbackImage(word) {
  const seed = encodeURIComponent(word.toLowerCase());
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function fallbackAudio(word) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(
    word
  )}`;
}

async function fetchWords(limit = 1000) {
  const response = await fetch(WORD_SOURCE_URL);
  if (!response.ok) {
    throw new Error("Cannot download word list.");
  }
  const text = await response.text();
  return text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length > 1)
    .slice(0, limit);
}

async function fetchWordMeta(word) {
  try {
    const response = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);
    if (!response.ok) {
      return {
        ipa: "",
        sentence: defaultSentence(word),
        audio: fallbackAudio(word),
      };
    }
    const data = await response.json();
    const first = data?.[0] || {};
    const ipa = (first.phonetic || "").trim();

    let audio = "";
    const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];
    for (const p of phonetics) {
      if (p?.audio) {
        audio = p.audio;
        break;
      }
    }

    let sentence = defaultSentence(word);
    const meanings = Array.isArray(first.meanings) ? first.meanings : [];
    for (const meaning of meanings) {
      const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
      for (const def of defs) {
        if (def?.example) {
          sentence = String(def.example).slice(0, 250);
          break;
        }
      }
      if (sentence !== defaultSentence(word)) {
        break;
      }
    }

    return {
      ipa,
      sentence,
      audio: audio || fallbackAudio(word),
    };
  } catch {
    return {
      ipa: "",
      sentence: defaultSentence(word),
      audio: fallbackAudio(word),
    };
  }
}

async function main() {
  const connection = await mysql.createConnection(getConfig());
  // Ensure the vocabulary table exists in the target database.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      word VARCHAR(120) NOT NULL,
      ipa VARCHAR(120) NULL,
      meaning VARCHAR(255) NULL,
      vietnamese_meaning VARCHAR(255) NULL,
      part_of_speech VARCHAR(40) NULL,
      topic VARCHAR(120) NULL,
      question_text VARCHAR(255) NULL,
      example_sentence VARCHAR(255) NOT NULL,
      example_sentence_vi VARCHAR(255) NULL,
      example_sentence_ipa VARCHAR(255) NULL,
      example_audio_url VARCHAR(500) NULL,
      image_url VARCHAR(500) NOT NULL,
      audio_url VARCHAR(500) NOT NULL,
      level ENUM('beginner','elementary','intermediate') NOT NULL DEFAULT 'beginner',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vocabulary_word_level (word, level),
      INDEX idx_vocabulary_level (level),
      INDEX idx_vocabulary_word (word)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const words = await fetchWords(1000);

  let inserted = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const meta = await fetchWordMeta(word);
    const titleWord = toTitleCase(word);

    await connection.query(
      `INSERT INTO vocabulary (word, ipa, example_sentence, image_url, audio_url, level)
       VALUES (?, ?, ?, ?, ?, 'beginner')
       ON DUPLICATE KEY UPDATE
         ipa = VALUES(ipa),
         example_sentence = VALUES(example_sentence),
         image_url = VALUES(image_url),
         audio_url = VALUES(audio_url),
         updated_at = CURRENT_TIMESTAMP`,
      [titleWord, meta.ipa, meta.sentence, fallbackImage(word), meta.audio]
    );

    inserted += 1;
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/1000 words...`);
    }
  }

  await connection.end();
  console.log(`Done. Upserted ${inserted} beginner vocabulary words.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
