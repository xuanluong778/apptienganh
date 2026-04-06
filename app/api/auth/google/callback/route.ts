import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSessionOnResponse } from "@/lib/auth/create-session";
import { createInitialSubscriptionForNewUser } from "@/lib/subscriptions/subscription-service";

function publicOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (!host) return new URL(request.url).origin;
  return `${proto}://${host}`;
}

function safeNextPath(raw: string | undefined) {
  if (!raw || typeof raw !== "string") return "/";
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  if (p.includes("..") || p.includes("\\")) return "/";
  if (p === "/auth" || p.startsWith("/auth?") || p.startsWith("/auth/")) return "/";
  return p;
}

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const fail = (code: string) => NextResponse.redirect(new URL(`/auth?notice=${code}`, origin));

  const err = request.nextUrl.searchParams.get("error");
  if (err) {
    return fail("google_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("google_oauth_state")?.value;
  const nextPath = request.cookies.get("google_oauth_next")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("google_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return fail("google_off");
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return fail("google_token");
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as { email?: string; name?: string; verified_email?: boolean };
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  const gName = typeof profile.name === "string" ? profile.name.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("google_email");
  }

  await pool.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL UNIQUE AFTER email");

  const [rows] = await pool.query(
    "SELECT id, name, email, phone FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const existing = (rows as { id: number; name: string; email: string | null; phone: string | null }[])[0];

  let userId: number;

  if (existing) {
    userId = Number(existing.id);
  } else {
    const placeholderPw = hashPassword(crypto.randomBytes(32).toString("hex"));
    const displayName = gName || email.split("@")[0] || "User";
    const [ins] = await pool.query(
      "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, NULL, ?)",
      [displayName, email, placeholderPw]
    );
    userId = Number((ins as ResultSetHeader).insertId);
    if (Number.isFinite(userId) && userId > 0) {
      try {
        await createInitialSubscriptionForNewUser(userId);
      } catch {
        /* non-fatal */
      }
    }
  }

  if (!Number.isFinite(userId) || userId <= 0) {
    return fail("google_user");
  }

  const dest = safeNextPath(nextPath);
  const res = NextResponse.redirect(new URL(dest, origin));
  res.cookies.delete("google_oauth_state");
  res.cookies.delete("google_oauth_next");
  await setSessionOnResponse(res, userId);
  return res;
}
