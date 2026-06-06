"use client";

import { useState } from "react";
import { playKidWordAudio, speakEnglish } from "@/lib/kids-vocabulary/browser-tts";
import RecordPlaybackButtons from "./RecordPlaybackButtons";
import styles from "./KidsVocabulary.module.css";

/** Cùng số từ với bài (tối đa 6) — ghi âm/chấm điểm trong khối RecordPlayback (tự dừng + điểm). */
export default function SpeakPractice({ words, onComplete, onWordDone }) {
  const slice = words.slice(0, Math.min(6, words.length));
  const [idx, setIdx] = useState(0);
  /** @type {"word"|"sentence"} */
  const [phase, setPhase] = useState("word");
  const w = slice[idx];
  const sent = String(w?.exampleSentence || "").trim();

  function listenModel() {
    if (!w) return;
    if (phase === "word") void playKidWordAudio({ word: w.word, audioUrl: w.audioUrl });
    else void speakEnglish(sent, { rate: 0.82 });
  }

  function goNextPhaseOrWord() {
    if (phase === "word" && sent) {
      setPhase("sentence");
      return;
    }
    onWordDone?.(w.id);
    if (idx + 1 >= slice.length) {
      onComplete?.();
    } else {
      setIdx((i) => i + 1);
      setPhase("word");
    }
  }

  if (!w) return null;

  const stepLabel = phase === "word" ? `Từ (${idx + 1}/${slice.length})` : `Câu (${idx + 1}/${slice.length})`;
  const resetKey = `${w.id}-${phase}`;
  const scoreTarget = phase === "word" ? w.word : sent;

  return (
    <div className={styles.cardInner}>
      <p style={{ fontWeight: 900, marginBottom: "0.35rem" }}>Nói và ghi âm — {stepLabel}</p>
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", fontWeight: 700, color: "#556" }}>
        Bấm <strong>Ghi âm</strong> dưới đây, đọc theo — máy tự dừng khi bạn ngừng một nhịp rồi hiện điểm (Chrome/Edge + internet).
      </p>
      {phase === "word" ? (
        <>
          <p className={styles.wordTitle}>{w.word}</p>
          <p className={styles.meaning}>{w.vietnameseMeaning}</p>
        </>
      ) : (
        <p className={styles.example} style={{ fontWeight: 800, fontSize: "1.05rem" }}>
          {sent}
        </p>
      )}

      <div className={styles.row}>
        <button type="button" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`} onClick={listenModel}>
          🔊 Nghe mẫu
        </button>
      </div>

      <RecordPlaybackButtons
        label={phase === "word" ? "🎙 Ghi âm đọc từ" : "🎙 Ghi âm đọc câu"}
        resetKey={resetKey}
        disabled={phase === "sentence" && !sent}
        scoreTarget={scoreTarget}
        scoreAsSentence={phase === "sentence"}
      />

      <div className={styles.row}>
        <button type="button" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`} onClick={goNextPhaseOrWord}>
          {phase === "word" && sent
            ? "Sang phần câu →"
            : idx + 1 >= slice.length
              ? "Xong phần nói ✓"
              : "Từ tiếp →"}
        </button>
      </div>
    </div>
  );
}
