"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  STORY_LIST_TABS,
  getStoriesByListCategory,
} from "@/lib/kids-stories/stories";
import vocabStyles from "@/components/kids-vocabulary/KidsVocabulary.module.css";
import storyStyles from "@/components/kids-stories/KidsStories.module.css";

export default function StoryList() {
  const [category, setCategory] = useState("kids");
  const [q, setQ] = useState("");
  const pool = useMemo(() => getStoriesByListCategory(category), [category]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter(
      (s) =>
        s.titleEn.toLowerCase().includes(needle) ||
        s.titleVi.toLowerCase().includes(needle) ||
        s.id.toLowerCase().includes(needle)
    );
  }, [q, pool]);

  return (
    <>
      <div
        className={`${vocabStyles.stepBar} ${storyStyles.storyListTabBar}`}
        role="tablist"
        aria-label="Loại truyện"
      >
        {STORY_LIST_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={category === t.id}
            className={`${vocabStyles.stepPill} ${storyStyles.storyListTabPill} ${category === t.id ? vocabStyles.stepPillActive : ""}`}
            onClick={() => setCategory(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p style={{ textAlign: "center", fontWeight: 800, margin: "0 0 0.65rem" }}>
        {filtered.length} / {pool.length} truyện
      </p>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm truyện (tiếng Anh / Việt)..."
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "block",
          margin: "0 auto 0.85rem",
          padding: "0.55rem 0.85rem",
          borderRadius: "999px",
          border: "2px solid #1a1a2e",
          fontSize: "0.95rem",
          fontWeight: 700,
        }}
      />
      <div className={vocabStyles.gridLessons}>
      {filtered.map((story) => (
        <Link key={story.id} href={`/kids-fun-stories/${story.id}`} className={vocabStyles.lessonCard}>
          <div className={vocabStyles.lessonEmoji} aria-hidden>
            {story.emoji}
          </div>
          <p className={vocabStyles.lessonTitle}>{story.titleEn}</p>
          <p className={vocabStyles.lessonSub}>{story.titleVi}</p>
          <p className={vocabStyles.lessonSub} style={{ marginTop: "0.35rem" }}>
            {story.paragraphs.length} câu · {story.vocabulary.length} từ · 3 game
          </p>
        </Link>
      ))}
      </div>
    </>
  );
}
