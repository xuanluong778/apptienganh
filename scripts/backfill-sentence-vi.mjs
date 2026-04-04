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
};

function mapAdj(adj) {
  const normalized = String(adj || "").trim().toLowerCase();
  return ADJ_MAP[normalized] || normalized;
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  await db.query(
    "ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS example_sentence_vi VARCHAR(500) NULL AFTER example_sentence"
  );

  const [rows] = await db.query(
    `SELECT id, word, vietnamese_meaning, example_sentence, example_sentence_vi
     FROM vocabulary
     WHERE example_sentence IS NOT NULL AND TRIM(example_sentence) <> ''`
  );

  const updates = [];
  for (const row of rows) {
    const sentence = String(row.example_sentence || "").trim();
    const meaning = String(row.vietnamese_meaning || "").trim();
    const word = String(row.word || "").trim().toLowerCase();

    let vi = String(row.example_sentence_vi || "").trim();
    const shouldRebuild =
      !vi ||
      vi.startsWith("Bản dịch câu:") ||
      vi.startsWith("Ban dich cau:") ||
      vi.startsWith("Câu này nói về") ||
      vi.startsWith("Cau nay noi ve") ||
      vi.startsWith("Ví dụ về từ") ||
      vi.startsWith("Vi du ve tu") ||
      vi.startsWith("Câu ví dụ:") ||
      vi.startsWith("Cau vi du:");
    if (!shouldRebuild) continue;

    const mSee = sentence.match(/^I can see (a|an)\s+(.+)\.$/i);
    const mLearn = sentence.match(/^I learn the word "(.+)" today\.$/i);
    const mTheIs = sentence.match(/^The\s+(.+?)\s+is\s+(.+)\.$/i);
    const mThisIs = sentence.match(/^This is (a|an)\s+(.+)\.$/i);
    const mLike = sentence.match(/^I like\s+(.+)\.$/i);
    const mThereIs = sentence.match(/^There is (a|an)\s+(.+)\.$/i);

    if (mSee && meaning) {
      vi = `Em có thể nhìn thấy ${meaning}.`;
    } else if (mTheIs && meaning) {
      vi = `${meaning} thì ${mapAdj(mTheIs[2])}.`;
    } else if (mThisIs && meaning) {
      vi = `Đây là ${meaning}.`;
    } else if (mLike && meaning) {
      vi = `Em thích ${meaning}.`;
    } else if (mThereIs && meaning) {
      vi = `Có ${meaning}.`;
    } else if (mLearn && meaning) {
      vi = `Hôm nay em học từ "${mLearn[1]}", nghĩa là "${meaning}".`;
    } else if (mLearn) {
      vi = `Hôm nay em học từ "${mLearn[1]}".`;
    } else if (meaning && word && sentence.toLowerCase().includes(word)) {
      vi = `Câu này nói về "${meaning}".`;
    } else if (meaning) {
      vi = `Ví dụ về từ "${meaning}".`;
    } else {
      vi = `Câu ví dụ: ${sentence}`;
    }

    updates.push([vi, row.id]);
  }

  for (const [vi, id] of updates) {
    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, id]);
  }

  const [checkRows] = await db.query(
    "SELECT word, example_sentence, example_sentence_vi FROM vocabulary WHERE topic = ? ORDER BY id DESC LIMIT 5",
    ["Động vật"]
  );
  console.log(`Updated ${updates.length} rows.`);
  console.log(checkRows);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
