/** Bottom nav + sidebar — flat, no nested menus on mobile */

import { SPEAKING_PATH } from "@/lib/beego/routes";

/** Mobile bottom nav: MUST stay 5 items */
export const BEEGO_BOTTOM_NAV_ITEMS = [
  { id: "learn", href: "/", label: "Học", icon: "📘" },
  { id: "speaking", href: SPEAKING_PATH, label: "Luyện nói", icon: "🎙️" },
  { id: "vocab", href: "/vocabulary", label: "Từ vựng", icon: "📚" },
  { id: "progress", href: "/progress", label: "Tiến độ", icon: "📊" },
  { id: "account", href: "/account", label: "Tài khoản", icon: "👤" },
];

/** App sidebar (tablet landscape + desktop): main navigation only */
export const BEEGO_SIDEBAR_ITEMS = [
  { id: "learn", href: "/", label: "Học", icon: "📘" },
  { id: "speaking", href: SPEAKING_PATH, label: "Luyện nói", icon: "🎙️" },
  { id: "vocab", href: "/vocabulary", label: "Từ vựng", icon: "📚" },
  { id: "stories", href: "/kids-fun-stories", label: "Câu truyện", icon: "📖" },
  { id: "pronunciation", href: "/pronunciation", label: "Phát âm", icon: "🎯" },
  // Các module này hiện chưa có page riêng → map vào Luyện nói để không phá UX
  { id: "grammar", href: SPEAKING_PATH, label: "Ngữ pháp", icon: "🧩" },
  { id: "listening", href: SPEAKING_PATH, label: "Luyện nghe", icon: "🎧" },
  { id: "quiz", href: "/quiz", label: "Quiz & Game", icon: "🧠" },
  { id: "progress", href: "/progress", label: "Tiến độ", icon: "📊" },
  { id: "account", href: "/account", label: "Tài khoản", icon: "👤" },
];

export function isNavActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const SHELL_HIDE_PREFIXES = [
  "/auth",
  "/admin",
  "/billing",
  "/onboarding",
  "/kids-learn-vocabulary",
  "/tracks",
];

export function shouldHideAppShell(pathname) {
  if (!pathname) return false;
  return SHELL_HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
