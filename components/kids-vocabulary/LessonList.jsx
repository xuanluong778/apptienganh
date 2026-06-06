"use client";

import Link from "next/link";
import { KIDS_VOCAB_LESSONS } from "@/lib/kids-vocabulary/curriculum";
import { lessonCompletionCount } from "@/lib/kids-vocabulary/progress";
import styles from "./KidsVocabulary.module.css";

export default function LessonList() {
  return (
    <div className={styles.gridLessons}>
      {KIDS_VOCAB_LESSONS.map((lesson) => {
        const ids = lesson.words.map((w) => w.id);
        const done = lessonCompletionCount(lesson.id, ids);
        const pct = Math.round((100 * done) / Math.max(1, lesson.words.length));
        return (
          <Link key={lesson.id} href={`/kids-learn-vocabulary/${lesson.id}`} className={styles.lessonCard}>
            <div className={styles.lessonEmoji}>{lesson.emoji}</div>
            <p className={styles.lessonTitle}>{lesson.titleEn}</p>
            <p className={styles.lessonSub}>{lesson.titleVi}</p>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%`, background: lesson.color }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
