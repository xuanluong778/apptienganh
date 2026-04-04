import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Kiểm tra nhanh: Node/Next đang chạy (không gọi database). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "apptienganh",
    time: new Date().toISOString(),
  });
}
