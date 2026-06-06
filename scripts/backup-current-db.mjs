/**
 * Backup database hiện tại (english_app) trước khi import legacy.
 * Chạy: node scripts/backup-current-db.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, ".backups");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1);
  }
  return env;
}

function sqlEscape(val) {
  if (val === null || val === undefined) return "NULL";
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (Buffer.isBuffer(val)) return `X'${val.toString("hex")}'`;
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return `'${String(val).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

async function main() {
  const env = loadEnv();
  const dbName = env.DB_NAME || "english_app";
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(BACKUP_DIR, `${dbName}-pre-import-${stamp}.sql`);

  const conn = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: dbName,
  });

  const lines = [
    `-- Beego backup before legacy import`,
    `-- Database: ${dbName}`,
    `-- Created: ${new Date().toISOString()}`,
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE \`${dbName}\`;`,
    "SET FOREIGN_KEY_CHECKS=0;",
  ];

  const [tables] = await conn.query("SHOW TABLES");
  for (const row of tables) {
    const table = Object.values(row)[0];
    const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRows[0]["Create Table"];
    lines.push(`\n-- Table: ${table}`);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${createSql};`);

    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `\`${c}\``).join(", ");
      const batch = 100;
      for (let i = 0; i < rows.length; i += batch) {
        const chunk = rows.slice(i, i + batch);
        const values = chunk
          .map((r) => `(${cols.map((c) => sqlEscape(r[c])).join(", ")})`)
          .join(",\n");
        lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES\n${values};`);
      }
    }
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  await conn.end();
  console.log("OK: backup saved to", outPath);
  console.log("Tables:", tables.length);
}

main().catch((e) => {
  console.error("BACKUP FAILED:", e.message);
  process.exit(1);
});
