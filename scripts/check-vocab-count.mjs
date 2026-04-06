/** node scripts/check-vocab-count.mjs — đếm từ trong DB (đọc .env.local) */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, eq).trim()] = v;
  }
}

const useDef = String(process.env.DB_USE_DEFAULT_LOCAL || "").toLowerCase() === "true";
const cfg = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: useDef ? "root" : process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "english_app",
};

const c = await mysql.createConnection(cfg);
const [[{ total }]] = await c.query("SELECT COUNT(*) AS total FROM vocabulary");
const [[{ beg }]] = await c.query("SELECT COUNT(*) AS beg FROM vocabulary WHERE level = 'beginner'");
const [[{ withVn }]] = await c.query(
  "SELECT COUNT(*) AS withVn FROM vocabulary WHERE level = 'beginner' AND TRIM(IFNULL(vietnamese_meaning,'')) <> ''"
);
console.log("database:", cfg.database);
console.log({ totalRows: total, beginnerRows: beg, beginnerWithVietnameseMeaning: withVn });
await c.end();
