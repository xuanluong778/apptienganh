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

const TOKEN_MAP = {
  expensive: "đắt",
  cheap: "rẻ",
  hard: "chăm chỉ",
  works: "làm việc",
  work: "làm việc",
  beautiful: "đẹp",
  friendly: "thân thiện",
  dangerous: "nguy hiểm",
  useful: "hữu ích",
  clear: "rõ ràng",
  bright: "sáng",
  successful: "thành công",
  student: "học sinh",
  famous: "nổi tiếng",
  interesting: "thú vị",
  boring: "chán",
  delicious: "ngon",
  wonderful: "tuyệt vời",
  terrible: "tệ",
  narrow: "hẹp",
  heavy: "nặng",
  clever: "thông minh",
  great: "tuyệt",
  sunny: "nắng",
  rainy: "mưa",
  cloudy: "nhiều mây",
  singer: "ca sĩ",
  actor: "diễn viên",
  lawyer: "luật sư",
  engineer: "kỹ sư",
  daughter: "con gái",
  brother: "anh/em trai",
  girlfriend: "bạn gái",
  boyfriend: "bạn trai",
  salad: "sa lát",
  green: "xanh lá",
  white: "trắng",
  piano: "đàn piano",
  guitar: "đàn guitar",
  email: "email",
  phone: "điện thoại",
};

function replaceTokens(text) {
  let out = String(text || "");
  for (const [en, vi] of Object.entries(TOKEN_MAP)) {
    const re = new RegExp(`\\b${en}\\b`, "gi");
    out = out.replace(re, vi);
  }
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT id, example_sentence_vi
     FROM vocabulary
     WHERE example_sentence_vi IS NOT NULL
       AND TRIM(example_sentence_vi) <> ''`
  );
  let updated = 0;
  for (const row of rows) {
    const before = String(row.example_sentence_vi || "");
    const after = replaceTokens(before);
    if (after !== before) {
      await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [after, row.id]);
      updated += 1;
    }
  }
  console.log(`token-replaced-updated=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
