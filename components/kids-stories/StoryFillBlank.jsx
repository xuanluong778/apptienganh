"use client";

import { useEffect, useState } from "react";
import styles from "@/components/kids-vocabulary/KidsVocabulary.module.css";

export default function StoryFillBlank({ items, prompt, promptVi, options, correctIndex, onComplete }) {
  const list =
    items ??
    (prompt
      ? [
          {
            prompt,
            promptVi,
            options,
            correctIndex,
          },
        ]
      : []);

  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState(null);
  const total = list.length;
  const item = list[round];

  useEffect(() => {
    setPicked(null);
  }, [round]);

  if (!item) return null;

  const done = picked !== null;
  const ok = picked === item.correctIndex;
  const answer = item.options[item.correctIndex];

  function choose(i) {
    if (picked !== null) return;
    setPicked(i);
  }

  function next() {
    if (!ok) {
      setPicked(null);
      return;
    }
    if (round + 1 >= total) {
      onComplete?.({ correct: total, total });
      return;
    }
    setRound((r) => r + 1);
  }

  return (
    <div>
      <p style={{ textAlign: "center", fontWeight: 900, marginBottom: "0.35rem" }}>
        Điền vào chỗ trống ({round + 1}/{total})
      </p>
      <p className={styles.wordTitle} style={{ fontSize: "1.15rem", textAlign: "center" }}>
        {item.prompt}
      </p>
      {item.promptVi ? (
        <p style={{ textAlign: "center", fontWeight: 700, color: "#556", fontSize: "0.88rem", margin: "0 0 0.75rem" }}>
          {item.promptVi}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "360px", margin: "0 auto" }}>
        {item.options.map((opt, i) => {
          let border = "2px solid #1a1a2e";
          if (done && i === item.correctIndex) border = "3px solid #2a9d8f";
          if (done && picked === i && i !== item.correctIndex) border = "3px solid #e63946";
          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              className={`${styles.bigBtn} ${styles.bigBtnGhost}`}
              style={{ width: "100%", border }}
              disabled={done}
              onClick={() => choose(i)}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>
      {done ? (
        <div className={`${styles.feedback} ${ok ? styles.feedbackGood : styles.feedbackTry}`} style={{ marginTop: "0.75rem" }}>
          {ok ? `🎉 Đúng rồi! ${answer}` : `Gần đúng rồi! Đáp án đúng là ${answer}.`}
        </div>
      ) : null}
      <div className={styles.row}>
        {picked !== null ? (
          <button type="button" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`} onClick={next}>
            {ok ? (round + 1 >= total ? "Hoàn thành ✓" : "Câu tiếp →") : "Thử lại"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
