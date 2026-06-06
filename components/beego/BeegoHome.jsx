"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEEGO_BRAND, BEEGO_CORE_TOOLS, BEEGO_TRACKS } from "@/lib/beego/brand";
import { SPEAKING_PATH } from "@/lib/beego/routes";
import { needsOnboarding } from "@/lib/beego/onboarding-storage";

export default function BeegoHome() {
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    setOnboardingDone(!needsOnboarding());
  }, []);

  return (
    <main className="beego-home">
      <div className="beego-home-inner">
        <section className="beego-hero">
          <p className="beego-hero-badge">🐝 {BEEGO_BRAND.domain}</p>
          <h1>
            {BEEGO_BRAND.name} — {BEEGO_BRAND.tagline}
          </h1>
          <p>{BEEGO_BRAND.description}</p>
          <div className="beego-hero-actions">
            <Link href="/onboarding" className="beego-btn beego-btn--primary">
              Bắt đầu — chọn mục tiêu học
            </Link>
            <Link href={SPEAKING_PATH} className="beego-btn beego-btn--secondary">
              Học ngay với AI
            </Link>
            {onboardingDone ? (
              <Link href="/dashboard" className="beego-btn beego-btn--secondary">
                Dashboard của tôi
              </Link>
            ) : null}
          </div>
        </section>

        <h2 className="beego-section-title">Chương trình Beego</h2>
        <p className="beego-section-sub">Mỗi nhánh tối ưu cho một độ tuổi và mục tiêu — Kids là module riêng cho trẻ em.</p>

        <div className="beego-track-grid">
          {BEEGO_TRACKS.map((track) => (
            <Link
              key={track.id}
              href={`/tracks/${track.slug}`}
              className="beego-track-card"
              style={{ borderTop: `4px solid ${track.accent}` }}
            >
              <div className="beego-track-card-top">
                <div
                  className="beego-track-icon"
                  style={{ background: `${track.accent}22` }}
                  aria-hidden
                >
                  {track.icon}
                </div>
                <div>
                  <h3>{track.name}</h3>
                  <p>{track.tagline}</p>
                </div>
              </div>
              <div className="beego-track-audience">{track.audience}</div>
            </Link>
          ))}
        </div>

        <h2 className="beego-section-title">Công cụ học tập</h2>
        <p className="beego-section-sub">Dùng chung cho mọi chương trình — không đổi API hay luồng hiện có.</p>

        <div className="beego-tools-grid">
          {BEEGO_CORE_TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="beego-tool-card">
              <div className="beego-tool-icon" aria-hidden>
                {tool.icon}
              </div>
              <div>
                <strong>{tool.label}</strong>
                <span>{tool.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
