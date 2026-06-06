import fs from "fs";

const BACKUP = process.argv[2] || "C:/laragon/backup/mysql/mysql-8.4-2026-05-25_225848.sql";

const text = fs.readFileSync(BACKUP, "utf8");
const marker = "USE `apptienganh`";
const start = text.indexOf(marker);
if (start < 0) {
  console.error("Không tìm thấy USE apptienganh trong backup");
  process.exit(1);
}
const end = text.indexOf("\n-- Dumping events for database", start);
const chunk = end > start ? text.slice(start, end) : text.slice(start);

const tables = [...chunk.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]);
const rowEstimates = {};
for (const m of chunk.matchAll(/INSERT INTO `([^`]+)`/g)) {
  rowEstimates[m[1]] = (rowEstimates[m[1]] || 0) + 1;
}

console.log("Backup:", BACKUP);
console.log("Tables:", tables.length);
for (const t of tables.sort()) {
  console.log(`  ${t}: ${rowEstimates[t] || 0} INSERT statement(s)`);
}
