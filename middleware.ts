import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session_token";

/** Trang & API chỉ đọc nội dung học — không cần đăng nhập (API nhạy cảm vẫn tự kiểm tra session bên trong). */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/billing/webhook") return true;
  // Mọi route kiểm tra sức khỏe (kể cả /api/health/db) — tránh VPS bản cũ sót từng path.
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/uploads/")) return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|xml|json|webmanifest|woff2?)$/i.test(pathname)) {
    return true;
  }
  if (pathname === "/" || pathname === "/quiz" || pathname === "/matching" || pathname === "/memory") {
    return true;
  }
  if (pathname === "/vocabulary" || pathname === "/dictionary") return true;
  return false;
}

function isPublicApiPath(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (pathname.startsWith("/api/vocabulary")) {
    return m === "GET" || m === "HEAD" || m === "OPTIONS";
  }
  if (pathname.startsWith("/api/quiz/")) return true;
  if (pathname.startsWith("/api/matching/")) return true;
  if (pathname.startsWith("/api/dictionary/")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname, method)) {
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Khớp mọi path trừ toàn bộ /_next/* (static, image, flight, HMR…) — tránh middleware chạm request chunk JS/CSS.
  matcher: ["/((?!_next/).*)"],
};
