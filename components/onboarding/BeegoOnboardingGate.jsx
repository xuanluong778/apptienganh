"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSpeakingPath } from "@/lib/beego/routes";
import { needsOnboarding } from "@/lib/beego/onboarding-storage";

const SKIP_PATHS = new Set(["/onboarding", "/auth", "/"]);

export default function BeegoOnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || SKIP_PATHS.has(pathname) || pathname.startsWith("/auth")) return;
    if (pathname !== "/progress" && !isSpeakingPath(pathname)) return;
    if (!needsOnboarding()) return;
    router.replace("/onboarding");
  }, [pathname, router]);

  return null;
}
