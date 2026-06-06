"use client";

import Link from "next/link";
import LessonList from "@/components/kids-vocabulary/LessonList";
import ProgressDashboard from "@/components/kids-vocabulary/ProgressDashboard";
import styles from "@/components/kids-vocabulary/KidsVocabulary.module.css";

export default function KidsLearnVocabularyPage() {
  return (
    <main className={styles.wrap}>
      <header className={styles.hero}>
        <h1>Học từ vựng vui 🎈</h1>
        <p>Chọn chủ đề — học ngắn, có hình, có âm thanh, có thưởng sao! (Âm đọc dùng giọng máy; nên dùng Chrome/Edge và bật loa.)</p>
        <div className={styles.row} style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
          <Link href="/kids-fun-stories" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`}>
            📖 Truyện vui
          </Link>
          <Link href="/vocabulary" className={`${styles.bigBtn} ${styles.bigBtnGhost}`}>
            Từ vựng lớn (1000 từ)
          </Link>
        </div>
      </header>
      <LessonList />
      <ProgressDashboard />
    </main>
  );
}
