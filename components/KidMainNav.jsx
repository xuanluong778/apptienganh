"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useAuthLoggedIn } from "@/hooks/useAuthLoggedIn";
import { useGuestGate } from "@/components/GuestGateProvider";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/lessons", label: "Bài học" },
  { href: "/quiz", label: "Quiz" },
  { href: "/matching", label: "Nối từ" },
  { href: "/memory", label: "Ghi nhớ" },
  { href: "/dashboard", label: "Tiến độ" },
  { href: "/vocabulary", label: "Từ vựng" },
  { href: "/dictionary", label: "Từ điển" },
];

/** Khách vẫn vào được (khớp middleware + API public). */
const GUEST_ALLOWED_HREFS = new Set(["/", "/quiz", "/matching", "/memory", "/vocabulary", "/dictionary"]);

export default function KidMainNav() {
  const { loggedIn } = useAuthLoggedIn();
  const { showLoginRequired } = useGuestGate();

  const onNavClick = useCallback(
    (e, href) => {
      if (loggedIn !== false) return;
      if (GUEST_ALLOWED_HREFS.has(href)) return;
      e.preventDefault();
      showLoginRequired();
    },
    [loggedIn, showLoginRequired]
  );

  return (
    <nav className="kid-nav kid-nav--grow">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="kid-nav-link"
          onClick={(e) => onNavClick(e, link.href)}
          prefetch={loggedIn !== false}
        >
          {link.label}
        </Link>
      ))}
      <Link
        href="/admin"
        className="kid-nav-link kid-nav-link--admin"
        onClick={(e) => onNavClick(e, "/admin")}
        prefetch={loggedIn !== false}
      >
        Quản trị
      </Link>
    </nav>
  );
}
