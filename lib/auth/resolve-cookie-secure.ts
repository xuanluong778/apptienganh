/**
 * Chỉ bật Secure khi request là HTTPS (qua X-Forwarded-Proto) hoặc COOKIE_SECURE=true.
 * Tránh cookie không gửi lại khi site chạy HTTP nhưng NODE_ENV=production.
 */
export function resolveCookieSecure(request?: Pick<Request, "headers">): boolean {
  const raw = request?.headers?.get("x-forwarded-proto") ?? "";
  const proto = raw.split(",")[0]?.trim().toLowerCase() || "";
  if (proto === "https") return true;
  return String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";
}
