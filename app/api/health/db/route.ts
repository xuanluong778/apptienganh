import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kiểm tra kết nối MySQL (SELECT 1).
 * - Development: gọi trực tiếp GET /api/health/db
 * - Production: đặt DB_PING_SECRET trong env, gọi:
 *   GET /api/health/db?secret=... hoặc header X-DB-Ping-Secret
 */
export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const expected = process.env.DB_PING_SECRET;

  if (isProd) {
    if (!expected) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Production: set DB_PING_SECRET in env, then pass ?secret=... or header X-DB-Ping-Secret.",
        },
        { status: 503 }
      );
    }
    const provided =
      request.headers.get("x-db-ping-secret") ||
      request.nextUrl.searchParams.get("secret");
    if (provided !== expected) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    await pool.query("SELECT 1 AS ping");
    return NextResponse.json({
      ok: true,
      database: true,
      time: new Date().toISOString(),
    });
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : undefined;
    const payload = isProd
      ? { ok: false, database: false, code: code || "error", time: new Date().toISOString() }
      : {
          ok: false,
          database: false,
          code,
          message: e instanceof Error ? e.message : String(e),
          time: new Date().toISOString(),
        };
    return NextResponse.json(payload, { status: 503 });
  }
}
