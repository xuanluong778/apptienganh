"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BEEGO_BOTTOM_NAV_ITEMS, isNavActive } from "@/lib/beego/nav";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="beego-bottom-nav beego-shell-nav" aria-label="Menu chính">
      {BEEGO_BOTTOM_NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`beego-bottom-nav-item ${active ? "beego-bottom-nav-item--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="beego-bottom-nav-icon" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
