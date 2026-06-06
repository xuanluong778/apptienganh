"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getStoryById } from "@/lib/kids-stories/stories";
import StoryRunner from "@/components/kids-stories/StoryRunner";
import styles from "@/components/kids-vocabulary/KidsVocabulary.module.css";

export default function KidsStoryPage() {
  const params = useParams();
  const id = String(params?.storyId || "");
  const story = getStoryById(id);
  if (!story) notFound();

  return (
    <main className={styles.wrap}>
      <div className={styles.row} style={{ marginBottom: "0.75rem", justifyContent: "flex-start" }}>
        <Link href="/kids-fun-stories" className={`${styles.bigBtn} ${styles.bigBtnGhost}`}>
          ← Chọn truyện
        </Link>
      </div>
      <header className={styles.hero} style={{ borderColor: story.color, boxShadow: `8px 8px 0 ${story.color}` }}>
        <h1>
          {story.emoji} {story.titleEn}
        </h1>
        <p>{story.titleVi}</p>
      </header>
      <StoryRunner story={story} />
    </main>
  );
}
