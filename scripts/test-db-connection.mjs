/**
 * Kiểm tra kết nối MySQL với biến giống .env.local (chạy: node scripts/test-db-connection.mjs)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function loadDotEnvLocal() {
  if (!fs.existsSync(envPath)) {
    console.error("Không thấy .env.local");
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDotEnvLocal();

const host = process.env.DB_HOST || "127.0.0.1";
const port = Number(process.env.DB_PORT || 3306);
const useDefaultLocal =
  String(process.env.DB_USE_DEFAULT_LOCAL || "").toLowerCase() === "true";
const user = useDefaultLocal ? "root" : process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD ?? "";
const database = process.env.DB_NAME || "english_app";

async function main() {
  console.log("Thử kết nối:", { host, port, user, database, password: password ? "***" : "(rỗng)" });
  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });
    await conn.query("SELECT 1 AS ok");
    await conn.end();
    console.log("OK: kết nối MySQL thành công.");
  } catch (e) {
    console.error("LỖI:", e.code || "", e.message);
    if (e.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "\n=> Sửa user/mật khẩu trong .env.local hoặc bật DB_USE_DEFAULT_LOCAL=true (Laragon root thường là mật khẩu rỗng)."
      );
    }
    if (e.code === "ER_BAD_DB_ERROR") {
      console.error("\n=> Tạo database trong Laragon / HeidiSQL: CREATE DATABASE ...;");
    }
    if (e.code === "ECONNREFUSED") {
      console.error("\n=> Bật MySQL trong Laragon (Start All) và kiểm tra port 3306.");
    }
    process.exit(1);
  }
}

main();
