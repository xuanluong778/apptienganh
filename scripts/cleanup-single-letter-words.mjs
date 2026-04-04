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

async function countSingleLetter(connection) {
  const [rows] = await connection.query(
    "SELECT COUNT(1) AS total FROM vocabulary WHERE word REGEXP '^[A-Za-z]$'"
  );
  return Number(rows[0]?.total || 0);
}

async function main() {
  const connection = await mysql.createConnection(getConfig());
  const before = await countSingleLetter(connection);

  const [result] = await connection.query(
    "DELETE FROM vocabulary WHERE word REGEXP '^[A-Za-z]$'"
  );

  const after = await countSingleLetter(connection);
  console.log(`single-letter-before=${before}`);
  console.log(`deleted=${Number(result.affectedRows || 0)}`);
  console.log(`single-letter-after=${after}`);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
