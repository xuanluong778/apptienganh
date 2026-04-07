/**
 * 1) Kiểm tra kết nối MySQL (.env.local giống app)
 * 2) Tạo / cập nhật user test (đăng nhập bằng email + mật khẩu)
 *
 * Chạy: node scripts/seed-test-user.mjs
 * Tuỳ chọn: TEST_USER_EMAIL=... TEST_USER_PASSWORD=... TEST_USER_NAME="..." TEST_USER_PHONE=0976...
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { normalizePhoneForStorage } from "../lib/phone-vn.js";

/** Khớp lib/auth.js hashPassword (scrypt) để đăng nhập qua app. */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString("hex");
  return `${salt}:${hash}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(name) {
  const envPath = path.join(root, name);
  if (!fs.existsSync(envPath)) return false;
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
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
  return true;
}

function mysqlConfigFromEnv() {
  const urlRaw = process.env.DATABASE_URL?.trim();
  if (urlRaw) {
    const u = new URL(urlRaw);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  const useDefaultLocal =
    String(process.env.DB_USE_DEFAULT_LOCAL || "").toLowerCase() === "true";
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = useDefaultLocal ? "root" : process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME || "english_app";
  return { host, port, user, password, database };
}

async function main() {
  loadEnvFile(".env.local") || loadEnvFile(".env");
  const cfg = mysqlConfigFromEnv();
  const testEmail =
    process.env.TEST_USER_EMAIL?.trim() || "test@apptienganh.local";
  const testPassword = process.env.TEST_USER_PASSWORD || "Test123456";
  const testName = process.env.TEST_USER_NAME?.trim() || "Test User";
  const testPhoneRaw = process.env.TEST_USER_PHONE?.trim();
  const testPhoneStored = testPhoneRaw
    ? normalizePhoneForStorage(testPhoneRaw)
    : "";

  console.log("Kết nối:", {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    database: cfg.database,
    password: cfg.password ? "***" : "(rỗng)",
  });

  let conn;
  try {
    conn = await mysql.createConnection(cfg);
  } catch (e) {
    console.error("LỖI kết nối:", e.code || "", e.message);
    process.exit(1);
  }

  try {
    await conn.query("SELECT 1 AS ok");
    console.log("OK: MySQL kết nối thành công.\n");

    const [[{ dbname }]] = await conn.query(`SELECT DATABASE() AS dbname`);
    const [colRows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbname]
    );
    const colSet = new Set(colRows.map((r) => r.COLUMN_NAME));
    if (!colSet.has("email") || !colSet.has("password_hash")) {
      console.error("Bảng users thiếu cột email hoặc password_hash.");
      process.exit(1);
    }

    const hasPhone = colSet.has("phone");
    const hash = hashPassword(testPassword);

    const [existing] = await conn.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [testEmail]
    );

    if (existing.length) {
      if (hasPhone && testPhoneStored) {
        await conn.query(
          "UPDATE users SET name = ?, password_hash = ?, phone = ? WHERE email = ?",
          [testName, hash, testPhoneStored, testEmail]
        );
      } else {
        await conn.query("UPDATE users SET name = ?, password_hash = ? WHERE email = ?", [
          testName,
          hash,
          testEmail,
        ]);
      }
      console.log("Đã cập nhật tên + mật khẩu cho user có sẵn:", testEmail);
    } else {
      if (hasPhone) {
        await conn.query(
          "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
          [testName, testEmail, testPhoneStored || null, hash]
        );
      } else {
        await conn.query(
          "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
          [testName, testEmail, hash]
        );
      }
      console.log("Đã tạo tài khoản test mới.");
    }

    console.log("\n--- Đăng nhập test ---");
    console.log("  Email:   ", testEmail);
    console.log("  Mật khẩu:", testPassword);
    console.log("  Tên:     ", testName);
    if (hasPhone && testPhoneStored) {
      console.log("  SĐT (DB):", testPhoneStored, "(đăng nhập 0xx / 84xx đều được)");
    } else if (testPhoneRaw && !testPhoneStored) {
      console.log("  Cảnh báo: TEST_USER_PHONE không hợp lệ, bỏ qua cột phone.");
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
