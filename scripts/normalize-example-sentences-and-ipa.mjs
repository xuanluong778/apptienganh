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

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function toBaseWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-z'-]/g, "")
    .trim();
}

function buildNaturalSentence(word, partOfSpeech) {
  const w = toBaseWord(word) || "word";
  if (partOfSpeech === "noun") return `This is ${articleFor(w)} ${w}.`;
  if (partOfSpeech === "verb") return `I can ${w} every day.`;
  if (partOfSpeech === "adjective") return `It is ${w}.`;
  return `This word is ${w}.`;
}

function buildSentenceVi(sentence, meaning, partOfSpeech) {
  const m = String(meaning || "").trim();
  if (partOfSpeech === "noun") return m ? `Đây là ${m}.` : "Đây là một từ.";
  if (partOfSpeech === "verb") return m ? `Em có thể ${m} mỗi ngày.` : "Em có thể làm điều này mỗi ngày.";
  if (partOfSpeech === "adjective") return m ? `Nó thì ${m}.` : "Nó có tính chất này.";
  return m ? `Từ này có nghĩa là ${m}.` : "Đây là một câu ví dụ.";
}

function buildSentenceIpa(sentence, ipaMap) {
  const tokens = String(sentence || "").match(/[A-Za-z']+|[^A-Za-z'\s]+/g) || [];
  const parts = tokens.map((token) => {
    if (!/^[A-Za-z']+$/.test(token)) return token;
    const t = token.toLowerCase();
    return ipaMap.get(t) || `/${t}/`;
  });
  return parts.join(" ").replace(/\s+([.,!?;:])/g, "$1");
}

function isTemplateSentence(s) {
  const text = String(s || "").trim();
  if (!text) return true;
  return (
    /^I learn the word ".*" in this topic\.$/i.test(text) ||
    /^I learn the word ".*" today\.$/i.test(text)
  );
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT id, word, ipa, part_of_speech, vietnamese_meaning, example_sentence, example_sentence_vi, example_sentence_ipa
     FROM vocabulary
     WHERE word IS NOT NULL AND TRIM(word) <> ''`
  );

  const ipaMap = new Map();
  for (const r of rows) {
    const key = toBaseWord(r.word);
    const ipa = String(r.ipa || "").trim();
    if (key && ipa) ipaMap.set(key, ipa);
  }

  let updatedSentence = 0;
  let updatedSentenceVi = 0;
  let updatedSentenceIpa = 0;

  for (const row of rows) {
    let sentence = String(row.example_sentence || "").trim();
    let sentenceVi = String(row.example_sentence_vi || "").trim();
    let sentenceIpa = String(row.example_sentence_ipa || "").trim();
    const pos = String(row.part_of_speech || "").toLowerCase();
    const meaning = String(row.vietnamese_meaning || "").trim();

    if (isTemplateSentence(sentence)) {
      const newSentence = buildNaturalSentence(row.word, pos);
      if (newSentence !== sentence) {
        sentence = newSentence;
        updatedSentence += 1;
      }
      const newVi = buildSentenceVi(sentence, meaning, pos);
      if (newVi && newVi !== sentenceVi) {
        sentenceVi = newVi;
        updatedSentenceVi += 1;
      }
    }

    if (!sentenceIpa || sentenceIpa === "/.../") {
      const newSentenceIpa = buildSentenceIpa(sentence, ipaMap);
      if (newSentenceIpa) {
        sentenceIpa = newSentenceIpa;
        updatedSentenceIpa += 1;
      }
    }

    await db.query(
      "UPDATE vocabulary SET example_sentence = ?, example_sentence_vi = ?, example_sentence_ipa = ? WHERE id = ?",
      [sentence, sentenceVi, sentenceIpa, row.id]
    );
  }

  console.log(`updated_example_sentence=${updatedSentence}`);
  console.log(`updated_example_sentence_vi=${updatedSentenceVi}`);
  console.log(`updated_example_sentence_ipa=${updatedSentenceIpa}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
