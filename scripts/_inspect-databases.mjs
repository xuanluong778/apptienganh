import fs from "fs";
import mysql from "mysql2/promise";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i)] = t.slice(i + 1);
}

const base = {
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || "root",
  password: env.DB_PASSWORD || "",
};

async function inspectDb(name) {
  const conn = await mysql.createConnection({ ...base, database: name });
  const [tables] = await conn.query("SHOW TABLES");
  const out = { database: name, tables: {} };
  for (const row of tables) {
    const t = Object.values(row)[0];
    const [c] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    out.tables[t] = Number(c[0].n);
  }
  await conn.end();
  return out;
}

async function main() {
  const conn = await mysql.createConnection(base);
  const [dbs] = await conn.query("SHOW DATABASES");
  await conn.end();
  const names = dbs.map((r) => r.Database).filter((n) => !["information_schema", "mysql", "performance_schema", "sys"].includes(n));
  console.log("Databases:", names.join(", "));
  for (const name of names) {
    try {
      const info = await inspectDb(name);
      const total = Object.values(info.tables).reduce((a, b) => a + b, 0);
      console.log(`\n=== ${name} (${Object.keys(info.tables).length} tables, ${total} rows) ===`);
      for (const [t, n] of Object.entries(info.tables).sort()) {
        if (n > 0) console.log(`  ${t}: ${n}`);
      }
    } catch (e) {
      console.log(`\n=== ${name} ERROR: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
