import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureUserSessionsTable } from "@/lib/auth/ensure-session-schema";

const COOKIE_NAME = "session_token";

export async function POST(request) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    await ensureUserSessionsTable();
    if (token) {
      await pool.query("DELETE FROM user_sessions WHERE token = ?", [token]);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to logout." },
      { status: 500 }
    );
  }
}
