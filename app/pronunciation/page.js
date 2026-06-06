"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IPA_PRACTICE_LESSONS } from "@/lib/ipa-practice-lessons";
import { evaluatePronunciation } from "@/lib/client-pronunciation-eval";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";

const PROGRESS_KEY = "ipa-practice-progress-v1";
const PASS_SCORE = 65;

function readProgress() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return typeof p === "object" && p ? p : {};
  } catch {
    return {};
  }
}

function writeProgress(data) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch (_e) {}
}

function speakEnglish(text, rate = 0.9) {
  if (typeof window === "undefined" || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

function countLessonDone(lesson, map) {
  const m = map[lesson.id] || {};
  let n = 0;
  for (const w of lesson.words) {
    if ((m[w.word.toLowerCase()] || 0) >= PASS_SCORE) n += 1;
  }
  return n;
}

export default function PronunciationPage() {
  const [progressMap, setProgressMap] = useState({});
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [lastEval, setLastEval] = useState(null);
  const recRef = useRef(null);

  useEffect(() => {
    setProgressMap(readProgress());
  }, []);

  const activeLesson = useMemo(
    () => IPA_PRACTICE_LESSONS.find((l) => l.id === activeLessonId) || null,
    [activeLessonId]
  );

  const currentWord = activeLesson?.words[wordIndex] || null;

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort?.();
      } catch (_e) {}
    };
  }, []);

  useEffect(() => {
    setLastEval(null);
    setInterimText("");
  }, [activeLessonId, wordIndex]);

  const updateWordScore = useCallback((lessonId, word, score) => {
    const k = word.toLowerCase();
    setProgressMap((prev) => {
      const next = { ...prev, [lessonId]: { ...(prev[lessonId] || {}) } };
      const prevSc = next[lessonId][k] || 0;
      next[lessonId][k] = Math.max(prevSc, Math.round(Number(score) || 0));
      writeProgress(next);
      return next;
    });
  }, []);

  const openLesson = (id) => {
    setActiveLessonId(id);
    setWordIndex(0);
  };

  const closeLesson = () => {
    try {
      recRef.current?.abort?.();
    } catch (_e) {}
    recRef.current = null;
    setIsRecording(false);
    setActiveLessonId(null);
    setLastEval(null);
  };

  const toggleRecord = () => {
    if (!currentWord || !activeLesson) return;
    if (isRecording && recRef.current) {
      recRef.current.stop();
      return;
    }
    setLastEval(null);
    setInterimText("");
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 1500,
      maxMs: 14000,
      onDone: (text) => {
        setIsRecording(false);
        recRef.current = null;
        const ev = evaluatePronunciation(text, currentWord.word, {
          expectedIpaText: currentWord.ipa,
          isSentence: false,
        });
        setLastEval(ev);
        updateWordScore(activeLesson.id, currentWord.word, ev.score);
      },
      onError: () => {
        setIsRecording(false);
        recRef.current = null;
        setLastEval({
          score: 0,
          message: "Chưa ghi âm được",
          details:
            "Cho phép micro trên trình duyệt, đọc rõ từ tiếng Anh hoặc thử lại sau vài giây.",
          phonemeGroups: [],
        });
      },
      onInterim: (t) => setInterimText(t),
    });
    if (ctrl) {
      recRef.current = ctrl;
      setIsRecording(true);
    } else {
      setLastEval({
        score: 0,
        message: "Trình duyệt không hỗ trợ",
        details: "Hãy dùng Chrome / Edge trên máy tính hoặc điện thoại.",
        phonemeGroups: [],
      });
    }
  };

  const milestoneJump = () => {
    const map = readProgress();
    const idx = IPA_PRACTICE_LESSONS.findIndex((l) => countLessonDone(l, map) < l.words.length);
    if (idx >= 0) {
      openLesson(IPA_PRACTICE_LESSONS[idx].id);
    } else {
      openLesson(IPA_PRACTICE_LESSONS[0].id);
    }
  };

  if (activeLesson && currentWord) {
    const done = countLessonDone(activeLesson, progressMap);
    const total = activeLesson.words.length;

    return (
      <main className="ipa-route">
        <div className="ipa-inner">
          <header className="ipa-detailBar">
            <button
              type="button"
              className="ipa-detailBarBtn"
              onClick={closeLesson}
              aria-label="Quay lại"
            >
              ←
            </button>
            <div className="ipa-detailBarTitle">{activeLesson.title}</div>
            <span className="ipa-detailBarMeta">
              <span className="ipa-detailProgress ipa-detailProgress--onBar">
                {wordIndex + 1}/{total}
              </span>
              {lastEval !== null && lastEval.score < PASS_SCORE ? (
                <span className="ipa-detailWarn" title="Điểm chưa đạt mục tiêu, thử đọc lại nhé" aria-hidden>
                  ⚠️
                </span>
              ) : null}
            </span>
          </header>

          <div className="ipa-card">
            <div className="ipa-hint ipa-hint--boxed">
              <span className="ipa-hintEmoji" aria-hidden>
                👋
              </span>
              <span>
                Bạn bấm vào <span className="ipa-hintMic">🎤</span> và đọc theo nhé.
              </span>
            </div>

            <div className="ipa-wordBar" aria-label="Từ luyện">
              <span className="ipa-wordBar-inner">{currentWord.word}</span>
            </div>
            <div className="ipa-sub">{currentWord.vi}</div>
            <div className="ipa-ipaLine">{currentWord.ipa}</div>

            <div className="ipa-audioRow">
              <button
                type="button"
                className="ipa-roundAudio"
                aria-label="Nghe mẫu"
                onClick={() => speakEnglish(currentWord.word, 0.88)}
              >
                🔊
              </button>
              <button
                type="button"
                className="ipa-roundAudio ipa-roundAudio--slow"
                aria-label="Nghe chậm"
                onClick={() => speakEnglish(currentWord.word, 0.52)}
              >
                🐌
              </button>
            </div>

            <div className="ipa-micWrap">
              <button
                type="button"
                className={`ipa-micBig ${isRecording ? "recording" : ""}`}
                onClick={toggleRecord}
                aria-label={isRecording ? "Dừng ghi âm" : "Ghi âm"}
              >
                {isRecording ? "⏹" : "🎤"}
              </button>
            </div>

            <p className="ipa-status">
              {isRecording
                ? interimText
                  ? `Đang nghe: ${interimText}`
                  : "Đang nghe… đọc từ mục tiêu nhé."
                : done >= total
                ? "Bài này đã luyện đủ mục tiêu — bạn vẫn có thể đọc lại."
                : ""}
            </p>

            {lastEval ? (
              <div className="ipa-scoreBox">
                <div className="ipa-scoreNum">{lastEval.score}/100</div>
                <p className="ipa-scoreMsg">{lastEval.message}</p>
                {lastEval.details ? <p className="ipa-scoreDetail">{lastEval.details}</p> : null}
              </div>
            ) : null}

            <div className="ipa-navWords">
              <button
                type="button"
                disabled={wordIndex <= 0}
                onClick={() => setWordIndex((i) => Math.max(0, i - 1))}
              >
                ‹
              </button>
              <div className="ipa-wordDots" aria-label="Các từ trong bài">
                {activeLesson.words.map((_, i) => (
                  <button
                    key={`${activeLesson.id}-dot-${i}`}
                    type="button"
                    className={`ipa-wordDot ${i === wordIndex ? "ipa-wordDot--current" : ""}`}
                    onClick={() => setWordIndex(i)}
                    aria-label={`Từ ${i + 1}`}
                    aria-current={i === wordIndex ? "step" : undefined}
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={wordIndex >= total - 1}
                onClick={() => setWordIndex((i) => Math.min(total - 1, i + 1))}
              >
                ›
              </button>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link href="/" style={{ color: "#00a8b0", fontWeight: 700 }}>
              Về trang chủ
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="ipa-route">
      <div className="ipa-inner">
        <div className="ipa-topbar">
          <Link href="/" className="ipa-iconBtn" aria-label="Trang chủ">
            ←
          </Link>
          <span className="ipa-iconBtn" aria-hidden style={{ cursor: "default" }}>
            📊
          </span>
        </div>
        <div className="ipa-hero">
          <h1 className="ipa-pageTitle">Điểm phát âm</h1>
          <p className="badge-new" aria-hidden>
            Nghe mẫu · Ghi âm · Nhận gợi ý
          </p>
          <p className="ipa-pageHint">
            Chọn bài bên dưới → nghe mẫu → bấm ghi âm → xem điểm và gợi ý sửa.
          </p>
        </div>

        <div className="ipa-list">
          {IPA_PRACTICE_LESSONS.map((lesson, idx) => {
            const lessonNoDesc = IPA_PRACTICE_LESSONS.length - idx;
            return (
            <div key={lesson.id}>
              {idx > 0 && idx % 4 === 0 ? (
                <button type="button" className="ipa-milestone" onClick={milestoneJump}>
                  Luyện tập tổng hợp
                </button>
              ) : null}
              <div className="ipa-lessonRow">
                <button
                  type="button"
                  className="ipa-lessonNum"
                  onClick={() => openLesson(lesson.id)}
                  aria-label={`Mở ${lesson.title}`}
                >
                  {lessonNoDesc}
                </button>
                <button type="button" className="ipa-lessonBody" onClick={() => openLesson(lesson.id)}>
                  <div className="ipa-lessonTitle">{lesson.title}</div>
                  <div className="ipa-stepIcons" aria-hidden>
                    <span title="Nghe mẫu">🔈</span>
                    <span className="ipa-stepArrow">›</span>
                    <span title="Ghi âm">🎤</span>
                    <span className="ipa-stepArrow">›</span>
                    <span title="Luyện">✏️</span>
                    <span className="ipa-stepArrow">›</span>
                    <span title="Nghe lại">🔈</span>
                  </div>
                  <div className="ipa-lessonMeta">
                    {countLessonDone(lesson, progressMap)} / {lesson.words.length} từ đạt mục tiêu
                  </div>
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link href="/" style={{ color: "#00a8b0", fontWeight: 700 }}>
            Về trang chủ
          </Link>
        </p>
      </div>
    </main>
  );
}
