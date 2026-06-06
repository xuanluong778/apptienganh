"use client";

import { useMemo, useRef, useState } from "react";
import { pickReviewWords } from "@/lib/kids-vocabulary/progress";
import styles from "./KidsVocabulary.module.css";

export default function ReviewQuiz({ words, onComplete, onWordResult }) {
  const ids = words.map((w) => w.id);
  const quizWords = useMemo(() => {
    const picked = pickReviewWords(ids, Math.min(5, words.length));
    const list = picked.length ? picked : ids.slice(0, Math.min(5, ids.length));
    return list.map((id) => words.find((w) => w.id === id)).filter(Boolean);
  }, [ids, words]);

  const [q, setQ] = useState(0);
  const [sel, setSel] = useState(null);
  const correctRef = useRef(0);
  const current = quizWords[q];

  const options = useMemo(() => {
    if (!current) return [];
    const distr = [...words].filter((w) => w.id !== current.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return [...distr, current].sort(() => Math.random() - 0.5);
  }, [current, words]);

  if (!current) {
    onComplete?.({ correct: 0, total: 0 });
    return null;
  }

  function submit(optId) {
    if (sel) return;
    setSel(optId);
    const ok = optId === current.id;
    if (ok) correctRef.current += 1;
    onWordResult?.(current.id, ok);
  }

  function next() {
    if (!sel) return;
    if (q + 1 >= quizWords.length) {
      onComplete?.({ correct: correctRef.current, total: quizWords.length });
      return;
    }
    setQ((i) => i + 1);
    setSel(null);
  }

  return (
    <div>
      <p style={{ textAlign: "center", fontWeight: 900 }}>Ôn tập: chọn nghĩa đúng</p>
      <p className={styles.wordTitle} style={{ textAlign: "center" }}>
        {current.word}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxWidth: "440px",
          margin: "1rem auto 0",
        }}
      >
        {options.map((opt) => {
          let border = "2px solid #1a1a2e";
          if (sel && opt.id === current.id) border = "3px solid #2a9d8f";
          if (sel && sel === opt.id && opt.id !== current.id) border = "3px solid #e63946";
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.bigBtn} ${styles.bigBtnGhost}`}
              style={{ width: "100%", border }}
              onClick={() => submit(opt.id)}
              disabled={Boolean(sel)}
            >
              {opt.vietnameseMeaning}
            </button>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontWeight: 800, marginTop: "0.75rem" }}>
        Câu {q + 1}/{quizWords.length}
      </p>
      {sel ? (
        <div className={styles.row}>
          <button type="button" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`} onClick={next}>
            {q + 1 >= quizWords.length ? "Hoàn thành quiz ✓" : "Câu tiếp →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
