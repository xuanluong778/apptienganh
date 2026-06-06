"use client";

import Link from "next/link";
import { getBeegoTrack } from "@/lib/beego/brand";

export default function BeegoTrackPage({ trackId }) {
  const track = getBeegoTrack(trackId);

  if (!track) {
    return (
      <main className="beego-track-page">
        <div className="beego-track-page-inner">
          <p>Không tìm thấy chương trình.</p>
          <Link href="/">Về trang chủ</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="beego-track-page">
      <div className="beego-track-page-inner">
        <section
          className="beego-track-hero"
          style={{ borderTop: `5px solid ${track.accent}` }}
        >
          <p className="beego-hero-badge">{track.icon} {track.audience}</p>
          <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading), Oswald, sans-serif", color: "var(--beego-ink)" }}>
            {track.name}
          </h1>
          <p style={{ margin: 0, color: "var(--beego-ink-soft)", fontWeight: 600 }}>{track.tagline}</p>
          <div className="beego-hero-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
            <Link
              href={`/onboarding?track=${track.id}`}
              className="beego-btn beego-btn--primary"
            >
              Chọn {track.shortName}
            </Link>
            {track.tools[0] ? (
              <Link href={track.tools[0].href} className="beego-btn beego-btn--secondary">
                Học ngay
              </Link>
            ) : null}
          </div>
        </section>

        <h2 className="beego-section-title">Lộ trình gợi ý</h2>
        <div className="beego-path-list">
          {track.path.map((step) => (
            <Link key={step.step} href={step.href} className="beego-path-step">
              <span className="beego-path-step-num">{step.step}</span>
              <div>
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </div>
              <span className="beego-path-go">Bắt đầu →</span>
            </Link>
          ))}
        </div>

        <h2 className="beego-section-title" style={{ marginTop: 24 }}>
          Công cụ trong {track.shortName}
        </h2>
        <div className="beego-tools-grid">
          {track.tools.map((tool) => (
            <Link key={tool.href + tool.label} href={tool.href} className="beego-tool-card">
              <div className="beego-tool-icon" aria-hidden>
                {tool.icon}
              </div>
              <div>
                <strong>{tool.label}</strong>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
