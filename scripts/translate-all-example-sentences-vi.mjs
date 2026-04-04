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

const ADJ_MAP = {
  tall: "cao",
  short: "thấp",
  kind: "tốt bụng",
  nice: "tốt bụng",
  big: "to",
  small: "nhỏ",
  old: "già",
  young: "trẻ",
  happy: "vui",
  sad: "buồn",
  strong: "mạnh",
  weak: "yếu",
  fast: "nhanh",
  slow: "chậm",
  beautiful: "đẹp",
  cute: "dễ thương",
  smart: "thông minh",
  good: "tốt",
  bad: "xấu",
  hungry: "đói",
  thirsty: "khát",
  friendly: "thân thiện",
  dangerous: "nguy hiểm",
};

const SUBJECT_MAP = {
  i: "Em",
  you: "Bạn",
  he: "Anh ấy",
  she: "Cô ấy",
  we: "Chúng em",
  they: "Họ",
  it: "Nó",
};

const NOUN_MAP = {
  person: "người",
  man: "người đàn ông",
  woman: "người phụ nữ",
  father: "bố",
  mother: "mẹ",
  brother: "anh/em trai",
  sister: "chị/em gái",
  boy: "cậu bé",
  girl: "cô bé",
  cat: "con mèo",
  dog: "con chó",
  bird: "con chim",
  fish: "con cá",
  family: "gia đình",
};

function mapAdj(adj) {
  const normalized = String(adj || "").trim().toLowerCase();
  return ADJ_MAP[normalized] || normalized;
}

function mapNoun(noun) {
  const n = String(noun || "").trim().toLowerCase();
  return NOUN_MAP[n] || n;
}

function translateByRule(sentence, meaning, word) {
  const s = String(sentence || "").trim();
  const m = String(meaning || "").trim();
  const w = String(word || "").trim().toLowerCase();
  if (!s) return "";

  const mSee = s.match(/^I can see (a|an)\s+(.+)\.$/i);
  if (mSee && m) return `Em có thể nhìn thấy ${m}.`;

  const mTheIs = s.match(/^The\s+(.+?)\s+is\s+(.+)\.$/i);
  if (mTheIs && m) return `${m} thì ${mapAdj(mTheIs[2])}.`;

  const mThisIs = s.match(/^This is (a|an)\s+(.+)\.$/i);
  if (mThisIs && m) return `Đây là ${m}.`;

  const mThereIs = s.match(/^There is (a|an)\s+(.+)\.$/i);
  if (mThereIs && m) return `Có ${m}.`;

  const mLike = s.match(/^I like\s+(.+)\.$/i);
  if (mLike && m) return `Em thích ${m}.`;

  const mLearn = s.match(/^I learn the word "(.+)" today\.$/i);
  if (mLearn && m) return `Hôm nay em học từ "${mLearn[1]}", nghĩa là "${m}".`;
  if (mLearn) return `Hôm nay em học từ "${mLearn[1]}".`;

  const mMyWorksHard = s.match(/^My\s+([A-Za-z\-]+)\s+works\s+hard\.$/i);
  if (mMyWorksHard) {
    const noun = mapNoun(mMyWorksHard[1]);
    return `${noun.charAt(0).toUpperCase() + noun.slice(1)} của em làm việc rất chăm chỉ.`;
  }

  const mPossessiveIsAdj = s.match(
    /^(My|Your|His|Her|Our|Their)\s+([A-Za-z\-]+)\s+is\s+([A-Za-z\-]+)\.$/i
  );
  if (mPossessiveIsAdj) {
    const ownerMap = {
      my: "của em",
      your: "của bạn",
      his: "của anh ấy",
      her: "của cô ấy",
      our: "của chúng em",
      their: "của họ",
    };
    const owner = ownerMap[mPossessiveIsAdj[1].toLowerCase()] || "";
    const noun = mapNoun(mPossessiveIsAdj[2]);
    const adj = mapAdj(mPossessiveIsAdj[3]);
    return `${noun.charAt(0).toUpperCase() + noun.slice(1)} ${owner} thì ${adj}.`;
  }

  const mSubjIsAdjNoun = s.match(
    /^(I|You|He|She|We|They|It)\s+(am|is|are)\s+(?:a|an)\s+([A-Za-z\-]+)\s+([A-Za-z\-]+)\.$/i
  );
  if (mSubjIsAdjNoun) {
    const subj = SUBJECT_MAP[mSubjIsAdjNoun[1].toLowerCase()] || mSubjIsAdjNoun[1];
    const adj = mapAdj(mSubjIsAdjNoun[3]);
    const noun = mapNoun(mSubjIsAdjNoun[4]);
    return `${subj} là một ${noun} ${adj}.`;
  }

  const mSubjIsAdj = s.match(/^(I|You|He|She|We|They|It)\s+(am|is|are)\s+([A-Za-z\-]+)\.$/i);
  if (mSubjIsAdj) {
    const subj = SUBJECT_MAP[mSubjIsAdj[1].toLowerCase()] || mSubjIsAdj[1];
    const adj = mapAdj(mSubjIsAdj[3]);
    return `${subj} thì ${adj}.`;
  }

  const mTheNounIsAdj = s.match(/^The\s+([A-Za-z\-]+)\s+is\s+([A-Za-z\-]+)\.$/i);
  if (mTheNounIsAdj) {
    const noun = mapNoun(mTheNounIsAdj[1]);
    const adj = mapAdj(mTheNounIsAdj[2]);
    return `${noun.charAt(0).toUpperCase() + noun.slice(1)} thì ${adj}.`;
  }

  if (m && w && s.toLowerCase().includes(w)) return `Câu này nói rằng ${m}.`;
  if (m) return `Câu ví dụ về ${m}.`;
  return "";
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
  await db.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_vi VARCHAR(500) NULL AFTER example_sentence"
  );

  const [rows] = await db.query(
    `SELECT id, word, vietnamese_meaning, example_sentence, example_sentence_vi
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

  let updated = 0;
  for (const row of rows) {
    const sentence = String(row.example_sentence || "").trim();
    if (!sentence) continue;

    // Prefer AI then public API, fallback to deterministic rules.
    let vi = await translateByAI(sentence);
    if (!vi) {
      vi = await translateByPublicApi(sentence);
    }
    if (!vi) {
      vi = translateByRule(sentence, row.vietnamese_meaning, row.word);
    }
    if (!vi) continue;

    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
  }

  console.log(`Translated and updated example_sentence_vi for ${updated} rows.`);
  const [sample] = await db.query(
    "SELECT word, example_sentence, example_sentence_vi FROM vocabulary ORDER BY id DESC LIMIT 5"
  );
  console.log(sample);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
