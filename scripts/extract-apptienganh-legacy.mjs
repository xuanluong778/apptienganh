/**
 * Tách database apptienganh từ Laragon full backup → file import staging.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, ".backups");
const SOURCE =
  process.argv[2] || "C:/laragon/backup/mysql/mysql-8.4-2026-05-25_225848.sql";
const STAGING_DB = process.argv[3] || "apptienganh_legacy";
const OUT = path.join(BACKUP_DIR, `${STAGING_DB}-import.sql`);

const text = fs.readFileSync(SOURCE, "utf8");
const marker = "USE `apptienganh`";
const start = text.indexOf(marker);
if (start < 0) {
  console.error("Không tìm thấy apptienganh trong backup:", SOURCE);
  process.exit(1);
}
const end = text.indexOf("\n-- Dumping events for database 'apptienganh'", start);
let chunk = end > start ? text.slice(start, end) : text.slice(start);

chunk = chunk.replace(/USE `apptienganh`/g, `USE \`${STAGING_DB}\``);
chunk = chunk.replace(/CREATE DATABASE.*?`apptienganh`/g, `CREATE DATABASE IF NOT EXISTS \`${STAGING_DB}\``);

const header = [
  `-- Extracted from ${SOURCE}`,
  `-- Staging DB: ${STAGING_DB}`,
  `CREATE DATABASE IF NOT EXISTS \`${STAGING_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  "SET NAMES utf8mb4;",
  "SET FOREIGN_KEY_CHECKS=0;",
  "",
].join("\n");

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.writeFileSync(OUT, header + chunk + "\nSET FOREIGN_KEY_CHECKS=1;\n", "utf8");
console.log("OK: extracted to", OUT);
console.log("Size MB:", (fs.statSync(OUT).size / 1024 / 1024).toFixed(2));
