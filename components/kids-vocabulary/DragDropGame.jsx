"use client";

import { useEffect, useMemo, useState } from "react";
import { shuffle } from "@/lib/kids-vocabulary/utils";
import styles from "./KidsVocabulary.module.css";

/** Một màn: 4 từ ghép 4 hình (mặc định từ vựng vui). */
function DragDropBoard({ words, onComplete }) {
  const subset = useMemo(() => {
    const picked = [];
    const usedImages = new Set();
    for (const w of shuffle([...words])) {
      if (w?.imageUrl && usedImages.has(w.imageUrl)) continue;
      if (w?.imageUrl) usedImages.add(w.imageUrl);
      picked.push(w);
      if (picked.length >= Math.min(4, words.length)) break;
    }
    if (picked.length < Math.min(4, words.length)) {
      for (const w of shuffle([...words])) {
        if (picked.some((p) => p.id === w.id)) continue;
        picked.push(w);
        if (picked.length >= Math.min(4, words.length)) break;
      }
    }
    return picked;
  }, [words]);
  const [assign, setAssign] = useState(() => ({}));
  const [dragWord, setDragWord] = useState(null);

  const done = subset.every((w) => assign[w.id] === w.id);

  function onDrop(slotWordId, e) {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || dragWord;
    if (!from) return;
    setAssign((a) => ({ ...a, [slotWordId]: from }));
    setDragWord(null);
  }

  function tapAssign(wordId, slotId) {
    if (!wordId) return;
    setAssign((a) => ({ ...a, [slotId]: wordId }));
  }

  return (
    <div>
      <p style={{ textAlign: "center", fontWeight: 900, marginBottom: "0.5rem" }}>
        Kéo từ vào đúng hình (hoặc bấm từ rồi bấm ô hình trên điện thoại)
      </p>
      <div className={styles.dragRow}>
        {subset.map((w) => (
          <div
            key={w.id}
            role="button"
            tabIndex={0}
            className={styles.chip}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", w.id);
              setDragWord(w.id);
            }}
            onClick={() => setDragWord((cur) => (cur === w.id ? null : w.id))}
            style={{ outline: dragWord === w.id ? "3px solid #4361ee" : undefined }}
          >
            {w.word}
          </div>
        ))}
      </div>
      <div className={styles.choiceGrid}>
        {subset.map((slot) => {
          const placed = assign[slot.id];
          const match = placed === slot.id;
          const zoneCls = [styles.dropZone, match ? styles.dropZoneFilled : ""].filter(Boolean).join(" ");
          return (
            <div
              key={slot.id}
              className={zoneCls}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(slot.id, e)}
              onClick={() => dragWord && tapAssign(dragWord, slot.id)}
            >
              <img src={slot.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain" }} />
              {placed ? (
                <p style={{ margin: "0.25rem 0 0", fontWeight: 900, fontSize: "0.8rem" }}>
                  {subset.find((x) => x.id === placed)?.word || "?"}
                </p>
              ) : (
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.75rem", opacity: 0.6 }}>Thả vào đây</p>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.row}>
        <button type="button" className={`${styles.bigBtn} ${styles.bigBtnGhost}`} onClick={() => setAssign({})}>
          Làm lại
        </button>
        <button
          type="button"
          className={`${styles.bigBtn} ${styles.bigBtnPrimary}`}
          disabled={!done}
          onClick={() => onComplete?.({ wordIds: subset.map((x) => x.id) })}
        >
          {done ? "Xong!" : "Ghép đủ 4 ô nhé"}
        </button>
      </div>
    </div>
  );
}

/** Nhiều câu: mỗi câu kéo 1 từ vào đúng 1 trong 4 hình. */
function DragDropRounds({ words, maxRounds, onComplete }) {
  const rounds = Math.min(maxRounds, words.length);
  const [round, setRound] = useState(0);
  const [assign, setAssign] = useState({});
  const [dragWord, setDragWord] = useState(null);
  const [feedback, setFeedback] = useState("");

  const target = words[round];
  const options = useMemo(() => {
    const pool = shuffle(words.filter((x) => x.id !== target.id)).slice(0, 3);
    return shuffle([target, ...pool]);
  }, [target, round, words]);

  useEffect(() => {
    setAssign({});
    setDragWord(null);
    setFeedback("");
  }, [round]);

  const placed = assign[target.id];
  const doneRound = placed === target.id;

  function onDrop(slotId, e) {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || dragWord;
    if (!from || placed) return;
    setAssign({ [target.id]: slotId });
    setDragWord(null);
    if (slotId === target.id) setFeedback("🎉 Đúng rồi!");
    else setFeedback("Chưa đúng — thử lại nhé!");
  }

  function tapAssign(slotId) {
    if (!dragWord || placed) return;
    setAssign({ [target.id]: slotId });
    setDragWord(null);
    if (slotId === target.id) setFeedback("🎉 Đúng rồi!");
    else setFeedback("Chưa đúng — thử lại nhé!");
  }

  function next() {
    if (!doneRound) {
      setAssign({});
      setFeedback("");
      return;
    }
    if (round + 1 >= rounds) {
      onComplete?.({ correct: rounds, total: rounds });
      return;
    }
    setRound((r) => r + 1);
  }

  return (
    <div>
      <p style={{ textAlign: "center", fontWeight: 900, marginBottom: "0.5rem" }}>
        Kéo từ vào đúng hình ({round + 1}/{rounds})
      </p>
      <div className={styles.dragRow}>
        <div
          role="button"
          tabIndex={0}
          className={styles.chip}
          draggable={!placed}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", target.id);
            setDragWord(target.id);
          }}
          onClick={() => !placed && setDragWord((cur) => (cur === target.id ? null : target.id))}
          style={{ outline: dragWord === target.id ? "3px solid #4361ee" : undefined }}
        >
          {target.word}
        </div>
      </div>
      <div className={styles.choiceGrid}>
        {options.map((slot) => {
          const isPlaced = placed === slot.id;
          const zoneCls = [styles.dropZone, isPlaced && doneRound ? styles.dropZoneFilled : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={slot.id}
              className={zoneCls}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(slot.id, e)}
              onClick={() => dragWord && tapAssign(slot.id)}
            >
              <img src={slot.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain" }} />
              {isPlaced ? (
                <p style={{ margin: "0.25rem 0 0", fontWeight: 900, fontSize: "0.8rem" }}>{target.word}</p>
              ) : (
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.75rem", opacity: 0.6 }}>Thả vào đây</p>
              )}
            </div>
          );
        })}
      </div>
      {feedback ? (
        <div className={`${styles.feedback} ${doneRound ? styles.feedbackGood : styles.feedbackTry}`}>{feedback}</div>
      ) : null}
      <div className={styles.row}>
        {placed ? (
          <button type="button" className={`${styles.bigBtn} ${styles.bigBtnPrimary}`} onClick={next}>
            {doneRound ? (round + 1 >= rounds ? "Hoàn thành ✓" : "Câu tiếp →") : "Thử lại"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function DragDropGame({ words, onComplete, maxRounds }) {
  if (maxRounds != null && maxRounds > 4) {
    return <DragDropRounds words={words} maxRounds={maxRounds} onComplete={onComplete} />;
  }
  return <DragDropBoard words={words} onComplete={onComplete} />;
}
