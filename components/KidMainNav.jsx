"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthLoggedIn } from "@/hooks/useAuthLoggedIn";
import { useGuestGate } from "@/components/GuestGateProvider";
import { SPEAKING_PATH } from "@/lib/beego/routes";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", icon: "🏠" },
  { href: SPEAKING_PATH, label: "Bài học", icon: "📘" },
  { href: "/quiz", label: "Quiz", icon: "🧠" },
  { href: "/pronunciation", label: "Phát Âm IPA", icon: "🎙️" },
  { href: "/kids-learn-vocabulary", label: "Từ vựng vui", icon: "🎈" },
  { href: "/kids-fun-stories", label: "Truyện vui", icon: "📖" },
  { href: "/vocabulary", label: "Từ vựng", icon: "📚" },
];

/** Khách vẫn vào được (khớp middleware + API public). */
const GUEST_ALLOWED_HREFS = new Set([
  "/",
  "/quiz",
  "/pronunciation",
  "/vocabulary",
  "/kids-learn-vocabulary",
  "/kids-fun-stories",
]);

export default function KidMainNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { loggedIn } = useAuthLoggedIn();
  const { showLoginRequired } = useGuestGate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onNavClick = useCallback(
    (e, href) => {
      if (loggedIn !== false) return;
      if (GUEST_ALLOWED_HREFS.has(href)) return;
      e.preventDefault();
      showLoginRequired();
    },
    [loggedIn, showLoginRequired]
  );

  const goBack = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  return (
    <>
      <div className="kid-mobile-head">
        <button type="button" className="kid-mobile-iconBtn" onClick={goBack} aria-label="Quay lại">
          ←
        </button>
        <div className="kid-mobile-title">Kids English</div>
        <button
          type="button"
          className="kid-mobile-iconBtn"
          aria-label="Mở menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      <nav className={`kid-nav kid-nav--grow ${mobileOpen ? "kid-nav--mobileOpen" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`kid-nav-link ${
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                ? "kid-nav-link--active"
                : ""
            }`}
            onClick={(e) => {
              onNavClick(e, link.href);
              setMobileOpen(false);
            }}
            prefetch={loggedIn !== false}
          >
            <span className="kid-nav-link-thumb" aria-hidden>
              {link.icon}
            </span>
            <span className="kid-nav-link-label">{link.label}</span>
            <span className="kid-nav-link-cta">HỌC NGAY</span>
          </Link>
        ))}
        <Link
          href="/admin"
          className={`kid-nav-link kid-nav-link--admin ${pathname === "/admin" ? "kid-nav-link--active" : ""}`}
          onClick={(e) => {
            onNavClick(e, "/admin");
            setMobileOpen(false);
          }}
          prefetch={loggedIn !== false}
        >
          <span className="kid-nav-link-thumb" aria-hidden>
            ⚙️
          </span>
          <span className="kid-nav-link-label">Quản trị</span>
          <span className="kid-nav-link-cta">HỌC NGAY</span>
        </Link>
      </nav>
    </>
  );
}
