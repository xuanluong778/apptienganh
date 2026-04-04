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

async function main() {
  const db = await mysql.createConnection(getConfig());

  const fixes = [
    { id: 21466, meaning: "nhà ga" },
    { id: 22363, meaning: "bên cạnh" },
    { id: 22579, meaning: "nhảy lên" },
    { id: 24326, meaning: "đơn vị GI" },
    { id: 24563, meaning: "lệnh cấm" },
    { id: 25737, meaning: "chim cu" },
    { id: 26640, meaning: "con ve" },
    { id: 27717, meaning: "bò (động vật)" },
  ];

  let updated = 0;
  for (const item of fixes) {
    const [res] = await db.query("UPDATE vocabulary SET vietnamese_meaning = ? WHERE id = ?", [
      item.meaning,
      item.id,
    ]);
    updated += Number(res.affectedRows || 0);
  }

  console.log(`manual-fixed=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
