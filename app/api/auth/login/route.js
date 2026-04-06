import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateSessionToken, verifyPassword } from "@/lib/auth";
import { phoneLoginCandidates } from "@/lib/phone-vn";

const COOKIE_NAME = "session_token";
const SESSION_DAYS = 7;

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : typeof body.email === "string"
        ? body.email.trim()
        : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "identifier and password are required." },
        { status: 400 }
      );
    }

    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL UNIQUE AFTER email");
    const normalizedIdentifier = identifier.toLowerCase();
    const isEmail = normalizedIdentifier.includes("@");

    let users;
    if (isEmail) {
      const [rows] = await pool.query(
        "SELECT id, name, email, phone, password_hash FROM users WHERE email = ? LIMIT 1",
        [normalizedIdentifier]
      );
      users = rows;
    } else {
      const candidates = phoneLoginCandidates(identifier);
      if (candidates.length === 0) {
        return NextResponse.json(
          { success: false, message: "identifier and password are required." },
          { status: 400 }
        );
      }
      const ph = candidates.map(() => "?").join(", ");
      const [rows] = await pool.query(
        `SELECT id, name, email, phone, password_hash FROM users WHERE phone IN (${ph}) LIMIT 1`,
        candidates
      );
      users = rows;
    }
    const user = users[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to login." },
      { status: 500 }
    );
  }
}
