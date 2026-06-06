"use client";

import { useEffect, useState } from "react";
import { KIDS_VOCAB_LESSONS } from "@/lib/kids-vocabulary/curriculum";
import { lessonCompletionCount, loadAllProgress, masteryPercent } from "@/lib/kids-vocabulary/progress";
import styles from "./KidsVocabulary.module.css";

export default function ProgressDashboard() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = () => tick((x) => x + 1);
    window.addEventListener("storage", t);
    window.addEventListener("kids_vocab_progress", t);
    return () => {
      window.removeEventListener("storage", t);
      window.removeEventListener("kids_vocab_progress", t);
    };
  }, []);

  return (
    <section className={styles.dashboard}>
      <h2>Tiến độ (lưu trên máy này)</h2>
      {KIDS_VOCAB_LESSONS.map((lesson) => {
        const ids = lesson.words.map((w) => w.id);
        const done = lessonCompletionCount(lesson.id, ids);
        const pct = Math.round((100 * done) / Math.max(1, lesson.words.length));
        const avgMastery =
          Math.round(ids.reduce((a, id) => a + masteryPercent(id), 0) / Math.max(1, ids.length)) || 0;
        return (
          <div key={lesson.id} className={styles.dashItem}>
            <div className={styles.dashLabel}>
              <span>
                {lesson.emoji} {lesson.titleEn}
              </span>
              <span>
                {done}/{lesson.words.length} từ · TB {avgMastery}%
              </span>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%`, background: lesson.color }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
