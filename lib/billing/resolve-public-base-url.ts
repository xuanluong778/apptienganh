import type { NextRequest } from "next/server";

/** Cơ sở URL công khai cho callback SePay / Stripe (ưu tiên NEXT_PUBLIC_APP_URL). */
export function resolvePublicBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "";
  if (fromEnv) return fromEnv;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const rawProto = request.headers.get("x-forwarded-proto") || "";
  const proto = rawProto.split(",")[0]?.trim() || "http";
  if (!host) {
    try {
      return new URL(request.url).origin;
    } catch {
      return "";
    }
  }
  return `${proto}://${host}`;
}
