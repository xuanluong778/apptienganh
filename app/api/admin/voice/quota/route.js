import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getVoiceRedis } from "@/lib/voice/redis";
import { defaultVoiceQuotaConfig, getVoiceQuotaConfigFromDb, setVoiceQuotaConfigToDb } from "@/lib/voice/quota-config";

export const runtime = "nodejs";

const ADMIN_EMAIL = "xuanluong778@gmail.com";

async function requireAdminUser(request) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT u.id, u.email
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  const user = rows[0] || null;
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) return null;
  return user;
}

async function mirrorToRedis(config) {
  const r = getVoiceRedis();
  if (!r) return;
  // Store per-plan hashes for fast lookups by gateway/workers.
  const pipeline = r.pipeline();
  for (const [plan, v] of Object.entries(config || {})) {
    const key = `voice:quota:plan:${plan}`;
    pipeline.hset(key, {
      maxStartsPerMin: String(v?.maxStartsPerMin ?? ""),
      maxConcurrentSessions: String(v?.maxConcurrentSessions ?? ""),
      stt_ms_day: String(v?.cap?.stt_ms_day ?? ""),
      stt_ms_month: String(v?.cap?.stt_ms_month ?? ""),
      llm_tokens_day: String(v?.cap?.llm_tokens_day ?? ""),
      llm_tokens_month: String(v?.cap?.llm_tokens_month ?? ""),
      tts_bytes_day: String(v?.cap?.tts_bytes_day ?? ""),
      tts_bytes_month: String(v?.cap?.tts_bytes_month ?? ""),
    });
    pipeline.expire(key, 60 * 60 * 24 * 30);
  }
  await pipeline.exec();
}

export async function GET(request) {
  const admin = await requireAdminUser(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Forbidden. Admin access only." }, { status: 403 });
  }
  const { config, updatedAt } = await getVoiceQuotaConfigFromDb();
  return NextResponse.json({ success: true, data: { config, updated_at: updatedAt } });
}

export async function POST(request) {
  const admin = await requireAdminUser(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Forbidden. Admin access only." }, { status: 403 });
  }
  const body = await request.json();
  const next = body?.config && typeof body.config === "object" ? body.config : null;
  if (!next) {
    return NextResponse.json({ success: false, message: "config is required." }, { status: 400 });
  }
  // Persist to DB and mirror to Redis.
  await setVoiceQuotaConfigToDb(next);
  await mirrorToRedis(next);
  return NextResponse.json({ success: true, data: { config: next } });
}

export async function PUT(request) {
  // Reset to defaults quickly.
  const admin = await requireAdminUser(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Forbidden. Admin access only." }, { status: 403 });
  }
  const config = defaultVoiceQuotaConfig();
  await setVoiceQuotaConfigToDb(config);
  await mirrorToRedis(config);
  return NextResponse.json({ success: true, data: { config } });
}

