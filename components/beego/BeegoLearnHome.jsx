"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEEGO_BRAND } from "@/lib/beego/brand";
import {
  readOnboardingProfile,
  getContinueLearningHref,
  BEEGO_PURPOSES,
  BEEGO_DAILY_MINUTES,
} from "@/lib/beego/onboarding-storage";
import { getBeegoTrack } from "@/lib/beego/brand";
import { SPEAKING_PATH } from "@/lib/beego/routes";
import BigCTAButton from "@/components/beego/ui/BigCTAButton";
import LearningCard from "@/components/beego/ui/LearningCard";
import ProgressRing from "@/components/beego/ui/ProgressRing";
import LessonFlowBar from "@/components/beego/LessonFlowBar";
export default function BeegoLearnHome() {
  const [profile, setProfile] = useState(null);
  const [loggedIn, setLoggedIn] = useState(null);
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    const load = () => setProfile(readOnboardingProfile());
    load();
    window.addEventListener("beego:onboarding", load);
    return () => window.removeEventListener("beego:onboarding", load);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setLoggedIn(res.ok && json.success);
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loggedIn || !profile) return;
    let cancelled = false;
    setDashLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json?.success) setDash(json.data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, profile]);

  const purposeLabel = BEEGO_PURPOSES.find((p) => p.id === profile?.purpose)?.label;
  const minutesLabel = BEEGO_DAILY_MINUTES.find((m) => m.id === profile?.dailyMinutes)?.label;
  const track = profile ? getBeegoTrack(profile.trackId) : null;
  const dailyProgress = Number(dash?.daily_progress || 0);
  const continueHref = profile ? getContinueLearningHref(profile) : "/onboarding";

  /* Guest landing — one primary action */
  if (!profile) {
    return (
      <div className="beego-page">
        <section className="beego-page-hero">
          <span className="beego-mascot" aria-hidden>
            🐝
          </span>
          <h1>{BEEGO_BRAND.name}</h1>
          <p>{BEEGO_BRAND.tagline}</p>
          <p style={{ marginTop: 8, fontSize: "0.92rem" }}>{BEEGO_BRAND.description}</p>
        </section>
        <BigCTAButton href="/onboarding" ariaLabel="Bắt đầu học với Beego">
          Bắt đầu học
        </BigCTAButton>
        <p style={{ textAlign: "center", marginTop: 16, color: "var(--beego-muted)", fontWeight: 600, fontSize: "0.88rem" }}>
          Miễn phí thử · Không cần biết công nghệ
        </p>
        <div style={{ marginTop: 28 }}>
          <h2 className="beego-section-title">Beego Kids</h2>
          <LearningCard
            href="/kids-learn-vocabulary"
            icon="🎈"
            title="Dành cho trẻ em"
            description="Từ vựng vui & truyện tương tác — nhánh riêng cho bé"
          />
        </div>
      </div>
    );
  }

  /* Logged-in style home — single primary CTA */
  return (
    <div className="beego-page">
      <section className="beego-page-hero" style={{ textAlign: "left", padding: "20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="beego-mascot beego-mascot--sm" aria-hidden>
            🐝
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ textAlign: "left", fontSize: "clamp(1.4rem,3vw,1.8rem)" }}>Học hôm nay</h1>
            <p style={{ textAlign: "left", margin: 0 }}>
              {purposeLabel ? `Mục tiêu: ${purposeLabel}` : track?.name}
              {minutesLabel ? ` · ${minutesLabel}/ngày` : ""}
            </p>
          </div>
          {loggedIn && !dashLoading ? (
            <ProgressRing value={dailyProgress} label={`${dailyProgress}%`} />
          ) : null}
        </div>
      </section>

      <LessonFlowBar />

      <BigCTAButton href={continueHref} ariaLabel="Tiếp tục học">
        Tiếp tục học
      </BigCTAButton>

      {loggedIn === false ? (
        <p style={{ textAlign: "center", marginTop: 12, fontSize: "0.88rem", color: "var(--beego-ink-soft)", fontWeight: 600 }}>
          <Link href="/auth" style={{ color: "var(--beego-blue)", fontWeight: 800 }}>
            Đăng nhập
          </Link>{" "}
          để lưu tiến độ
        </p>
      ) : null}

      <h2 className="beego-section-title" style={{ marginTop: 28 }}>
        Gợi ý cho bạn
      </h2>
      <div className="beego-grid-2 beego-grid-2--desktop-3">
        {profile.purpose === "kids" ? (
          <>
            <LearningCard href="/kids-learn-vocabulary" icon="🎈" title="Từ vựng vui" description="Flashcard & game cho bé" />
            <LearningCard href="/kids-fun-stories" icon="📖" title="Truyện vui" description="Đọc truyện tương tác" />
          </>
        ) : (
          <>
            <LearningCard href={SPEAKING_PATH} icon="🎙️" title="Beego Speaking AI" description="Chọn tình huống — bấm micro nói" />
            <LearningCard href="/quiz" icon="🧠" title="Ôn tập thông minh" description="Từ đến hạn ôn hôm nay" />
            <LearningCard href="/vocabulary" icon="📚" title="Từ vựng" description="Học & nghe mẫu" />
            <LearningCard href="/kids-fun-stories" icon="📖" title="Học qua câu truyện" description="Truyện song ngữ, tra từ, mini game" />
            <LearningCard href="/pronunciation" icon="🎯" title="Điểm phát âm" description="Nghe mẫu, ghi âm, nhận gợi ý" />
          </>
        )}
      </div>

      {loggedIn && dash ? (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 20, background: "var(--beego-surface)", border: "1px solid var(--beego-border)" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "var(--beego-ink-soft)" }}>
            Hôm nay: ôn <strong>{dash.review_count ?? 0}</strong> từ · mới còn <strong>{dash.new_words_count ?? 0}</strong> từ
          </p>
        </div>
      ) : null}

      {profile.purpose !== "kids" ? (
        <div style={{ marginTop: 16 }}>
          <LearningCard href="/kids-learn-vocabulary" icon="🐝" title="Beego Kids" description="Chuyển sang chế độ học cho trẻ em" />
        </div>
      ) : null}
    </div>
  );
}
