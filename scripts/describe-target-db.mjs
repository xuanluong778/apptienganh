import fs from "fs";
import mysql from "mysql2/promise";

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const conn = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME,
  });
  const [tables] = await conn.query("SHOW TABLES");
  for (const row of tables) {
    const t = Object.values(row)[0];
    const [cols] = await conn.query(`DESCRIBE \`${t}\``);
    const [cnt] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    console.log(`\n${t} (${cnt[0].n} rows)`);
    for (const c of cols) {
      console.log(`  ${c.Field}\t${c.Type}\t${c.Null}\t${c.Key}\t${c.Default}`);
    }
  }
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
