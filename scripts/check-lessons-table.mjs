import mysql from "mysql2/promise";

const cfg = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "english_app_2",
};

const conn = await mysql.createConnection(cfg);
const [rows] = await conn.query("DESCRIBE lessons");
console.log(rows);
await conn.end();

