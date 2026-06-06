"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBeegoTrack } from "@/lib/beego/brand";
import {
  readOnboardingProfile,
  BEEGO_PURPOSES,
  BEEGO_LEVELS,
  BEEGO_DAILY_MINUTES,
} from "@/lib/beego/onboarding-storage";

export default function BeegoDashboardPersonal() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = () => setProfile(readOnboardingProfile());
    load();
    window.addEventListener("beego:onboarding", load);
    return () => window.removeEventListener("beego:onboarding", load);
  }, []);

  if (!profile) {
    return (
      <div className="beego-dash-track-banner">
        <div>
          <strong style={{ color: "var(--beego-ink)", fontSize: "1rem" }}>Chưa có lộ trình</strong>
          <p style={{ margin: "6px 0 0", color: "var(--beego-ink-soft)", fontWeight: 600, fontSize: "0.9rem" }}>
            Chọn mục tiêu học để Beego gợi ý bài phù hợp.
          </p>
        </div>
        <Link href="/onboarding" className="beego-big-cta" style={{ padding: "10px 18px", fontSize: "0.88rem", width: "auto" }}>
          Thiết lập
        </Link>
      </div>
    );
  }

  const track = getBeegoTrack(profile.trackId);
  const purposeLabel = BEEGO_PURPOSES.find((p) => p.id === profile.purpose)?.label;
  const levelLabel = BEEGO_LEVELS.find((l) => l.id === profile.level)?.label;
  const minutesLabel = BEEGO_DAILY_MINUTES.find((m) => m.id === profile.dailyMinutes)?.label;

  if (!track) return null;

  return (
    <div>
      <div className="beego-dash-track-banner" style={{ borderColor: `${track.accent}55` }}>
        <div className="beego-dash-track-icon" style={{ background: `${track.accent}22` }} aria-hidden>
          {track.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: "var(--beego-ink)", fontSize: "1.05rem" }}>
            {purposeLabel || track.name}
          </strong>
          <p style={{ margin: "4px 0 0", color: "var(--beego-ink-soft)", fontWeight: 600, fontSize: "0.88rem" }}>
            {levelLabel}
            {minutesLabel ? ` · ${minutesLabel}/ngày` : ""}
          </p>
        </div>
        <Link href="/onboarding" className="beego-big-cta beego-big-cta--secondary" style={{ padding: "8px 14px", fontSize: "0.82rem", width: "auto" }}>
          Đổi mục tiêu
        </Link>
      </div>

      <h2 className="beego-section-title" style={{ fontSize: "1.15rem", marginBottom: 8 }}>
        Lộ trình gợi ý
      </h2>
      <div className="beego-path-list">
        {track.path.map((step) => (
          <Link key={step.step} href={step.href} className="beego-path-step">
            <span className="beego-path-step-num" style={{ background: `linear-gradient(180deg, ${track.accent}, ${track.accent}cc)` }}>
              {step.step}
            </span>
            <div>
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </div>
            <span className="beego-path-go">Học →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
