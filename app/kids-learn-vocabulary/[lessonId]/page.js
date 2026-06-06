"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getLessonById } from "@/lib/kids-vocabulary/curriculum";
import KidsLessonRunner from "@/components/kids-vocabulary/KidsLessonRunner";
import styles from "@/components/kids-vocabulary/KidsVocabulary.module.css";

export default function KidsLessonPage() {
  const params = useParams();
  const id = String(params?.lessonId || "");
  const lesson = getLessonById(id);
  if (!lesson) notFound();

  return (
    <main className={styles.wrap}>
      <div className={styles.row} style={{ marginBottom: "0.75rem", justifyContent: "flex-start" }}>
        <Link href="/kids-learn-vocabulary" className={`${styles.bigBtn} ${styles.bigBtnGhost}`}>
          ← Chọn bài
        </Link>
      </div>
      <header className={styles.hero} style={{ borderColor: lesson.color, boxShadow: `8px 8px 0 ${lesson.color}` }}>
        <h1>
          {lesson.emoji} {lesson.titleEn}
        </h1>
        <p>{lesson.titleVi}</p>
      </header>
      <KidsLessonRunner lesson={lesson} />
    </main>
  );
}
