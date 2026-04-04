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

function hasVietnamese(text) {
  return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    String(text || "")
  );
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    `SELECT id, vietnamese_meaning
     FROM vocabulary
     WHERE example_sentence LIKE 'I learn the word "%'
       AND example_sentence LIKE '%in this topic.'
       AND example_sentence_vi IS NOT NULL
       AND TRIM(example_sentence_vi) <> ''`
  );

  let updated = 0;
  for (const row of rows) {
    const meaning = String(row.vietnamese_meaning || "").trim();
    const lower = meaning.toLowerCase();
    let vi = "Hôm nay em học một từ mới trong chủ đề này.";
    if (lower.startsWith("tên riêng:")) {
      vi = "Hôm nay em học một tên riêng trong chủ đề này.";
    } else if (lower.startsWith("từ viết tắt:")) {
      vi = "Hôm nay em học một từ viết tắt trong chủ đề này.";
    } else if (lower.startsWith("thuật ngữ:")) {
      vi = "Hôm nay em học một thuật ngữ trong chủ đề này.";
    } else if (hasVietnamese(meaning)) {
      vi = `Hôm nay em học từ "${meaning}" trong chủ đề này.`;
    }
    await db.query("UPDATE vocabulary SET example_sentence_vi = ? WHERE id = ?", [vi, row.id]);
    updated += 1;
  }

  console.log(`template-normalized=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
