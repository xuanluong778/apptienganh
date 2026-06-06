"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import "./quiz.css";

function QuizMascot() {
  return (
    <div className="quizMascot" aria-hidden="true">
      <svg viewBox="0 0 96 96" width="56" height="56" role="img" focusable="false">
        <defs>
          <linearGradient id="qmBody" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="34" fill="url(#qmBody)" stroke="#0b2115" strokeWidth="4" />
        <circle cx="36" cy="42" r="6" fill="#0b2115" />
        <circle cx="60" cy="42" r="6" fill="#0b2115" />
        <path d="M32 60c6 8 26 8 32 0" fill="none" stroke="#0b2115" strokeWidth="5" strokeLinecap="round" />
        <path d="M16 44c6-8 10-12 16-14" fill="none" stroke="#0b2115" strokeWidth="4" strokeLinecap="round" />
        <path d="M80 44c-6-8-10-12-16-14" fill="none" stroke="#0b2115" strokeWidth="4" strokeLinecap="round" />
        <circle cx="48" cy="18" r="6" fill="#34d399" stroke="#0b2115" strokeWidth="3" />
      </svg>
    </div>
  );
}

export default function QuizPage() {
  const [mode, setMode] = useState("1");
  const [section, setSection] = useState(1);
  const [totalSections, setTotalSections] = useState(1);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [completedParts, setCompletedParts] = useState({});
  const [quizError, setQuizError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState(null); // null | "correct" | "wrong"
  const [resultFx, setResultFx] = useState(null); // null | "correct" | "wrong"
  const [xpTotal, setXpTotal] = useState(null);
  const [level, setLevel] = useState(null);
  const [streak, setStreak] = useState(0);
  const [xpToast, setXpToast] = useState(null); // null | { delta:number, at:number }
  const [streakFx, setStreakFx] = useState(null); // null | "up" | "reset"
  /** Sau khi chọn sai (MCQ): lần bấm tiếp theo mới qua câu sau */
  const [wrongReveal, setWrongReveal] = useState(false);
  /** Mode 3: sau «Nộp đáp án» — "wrong" | "correct"; sang câu sau khi bấm Câu tiếp */
  const [mode3Feedback, setMode3Feedback] = useState(null);
  const [m3Recording, setM3Recording] = useState(false);
  const m3RecRef = useRef(null);
  const quizSessionRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `qz_${Date.now()}_${Math.random()}`
  );
  const xpToastTimerRef = useRef(null);
  const streakFxTimerRef = useRef(null);
  const resultFxTimerRef = useRef(null);
  const completionKey = "quiz-completed-parts-v1";
  const [quizSource, setQuizSource] = useState("normal"); // "normal" | "review"

  const normAns = (s) => String(s ?? "").trim().toLowerCase();

  const markPartCompleted = (part) => {
    setCompletedParts((prev) => {
      const next = { ...prev, [part]: true };
      try {
        window.localStorage.setItem(completionKey, JSON.stringify(next));
      } catch (_error) {}
      return next;
    });
  };

  const resetRoundState = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setTextAnswer("");
    setShowResult(false);
    setWrongAnswers([]);
    setWrongReveal(false);
    setAnswerResult(null);
    setResultFx(null);
    setIsSubmitting(false);
    setXpToast(null);
    setStreakFx(null);
    setLevel(null);
    setMode3Feedback(null);
    setM3Recording(false);
    try {
      m3RecRef.current?.abort?.();
    } catch (_e) {}
    m3RecRef.current = null;
  };

  const playSfx = (kind) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      const now = ctx.currentTime;
      const isOk = kind === "correct";
      const f1 = isOk ? 880 : 220;
      const f2 = isOk ? 1320 : 160;

      o.type = "sine";
      o.frequency.setValueAtTime(f1, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(60, f2), now + 0.09);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (isOk ? 0.13 : 0.18));

      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + (isOk ? 0.14 : 0.19));

      o.onended = () => {
        try {
          ctx.close();
        } catch (_e) {}
      };
    } catch (_e) {
      // ignore
    }
  };

  const triggerResultFx = (kind) => {
    setResultFx(kind);
    playSfx(kind);
    if (resultFxTimerRef.current) window.clearTimeout(resultFxTimerRef.current);
    resultFxTimerRef.current = window.setTimeout(() => setResultFx(null), 520);
  };

  const loadRound = async (targetMode, targetSection, source = quizSource) => {
    setLoading(true);
    setQuizError("");
    const controller = new AbortController();
    const timeoutMs = 25000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const isReview = source === "review";
      const response = await fetch(
        `/api/quiz/round?mode=${targetMode}&section=${targetSection}${isReview ? "&source=review" : ""}`,
        { cache: "no-store", signal: controller.signal }
      );
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        setQuizData([]);
        setTotalSections(1);
        setQuizError("Máy chủ trả về dữ liệu không hợp lệ. Hãy tải lại trang.");
        resetRoundState();
        setLoading(false);
        return;
      }
      if (response.ok && result.success) {
        setQuizData(result.data || []);
        setSection(Number(result.meta?.section || targetSection || 1));
        setTotalSections(Number(result.meta?.total_sections || 1));
        setQuizError("");
      } else {
        setQuizData([]);
        setTotalSections(1);
        const msg =
          typeof result.message === "string" && result.message.trim()
            ? result.message.trim()
            : `Không tải được quiz (mã ${response.status}).`;
        setQuizError(msg);
      }
    } catch (err) {
      setQuizData([]);
      setTotalSections(1);
      if (err?.name === "AbortError") {
        setQuizError("Tải quiz quá lâu (timeout). Thử lại hoặc kiểm tra MySQL / API.");
      } else {
        setQuizError("Lỗi kết nối. Kiểm tra mạng và thử lại.");
      }
    } finally {
      clearTimeout(timeoutId);
    }
    resetRoundState();
    setLoading(false);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(completionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setCompletedParts(parsed);
        }
      }
    } catch (_error) {}
  }, []);

  useEffect(() => {
    // Support CTA: /quiz?mode=review (review-first quiz).
    try {
      const params = new URLSearchParams(window.location.search);
      const m = String(params.get("mode") || "").trim().toLowerCase();
      if (m === "review") {
        setQuizSource("review");
        setMode("1");
        setSection(1);
      }
    } catch (_e) {}
  }, []);

  useEffect(() => {
    loadRound(mode, section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, section, quizSource]);

  const currentQuestion = quizData[current] || null;
  const isLastQuestion = current === quizData.length - 1;
  const progress = useMemo(
    () => (quizData.length ? Math.round(((current + 1) / quizData.length) * 100) : 0),
    [current, quizData.length]
  );

  const getChoiceWord = (choice) =>
    choice && typeof choice === "object" && choice.word !== undefined ? choice.word : choice;

  const isChoiceCorrect = (choice) => {
    if (!currentQuestion) return false;
    return normAns(getChoiceWord(choice)) === normAns(currentQuestion.correct_answer);
  };

  const handleChoiceClick = (choice) => {
    if (!currentQuestion || wrongReveal || isSubmitting) {
      return;
    }
    const picked = getChoiceWord(choice);
    setSelected(picked);

    // Chỉ Việt → Anh: đọc từ tiếng Anh khi chọn đáp án. Anh → Việt: không đọc khi bấm đáp án.
    try {
      if (mode === "2") {
        playOptionWord(choice);
      }
    } catch (_e) {}
  };

  const submitSrsResult = async ({ wordId, correct }) => {
    try {
      const res = await fetch("/api/review/result", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_id: wordId,
          isCorrect: Boolean(correct),
          attempt_id: `${quizSessionRef.current}:${mode}:${wordId}:${current}`,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) return null;
      return json?.data || null;
    } catch (_e) {
      // optional: don't block quiz UX on transient API issues
      return null;
    }
  };

  const applyXpAndStreakFromApi = (data) => {
    const nextXpTotal = data?.stats?.xp_total;
    const nextStreak = data?.stats?.current_streak;
    const nextLevel = data?.stats?.level;
    const delta = Number(data?.stats?.xp_delta || 0);

    if (Number.isFinite(nextXpTotal)) setXpTotal(Number(nextXpTotal));
    if (Number.isFinite(nextLevel)) setLevel(Number(nextLevel));
    if (Number.isFinite(nextStreak)) {
      const s = Number(nextStreak);
      setStreak((prev) => {
        const p = Number(prev || 0);
        if (s > p) setStreakFx("up");
        else if (s === 1 && p > 1) setStreakFx("reset");
        return s;
      });
    }

    if (delta > 0) {
      setXpToast({ delta, at: Date.now() });
      if (xpToastTimerRef.current) window.clearTimeout(xpToastTimerRef.current);
      xpToastTimerRef.current = window.setTimeout(() => setXpToast(null), 1050);
    }

    if (streakFxTimerRef.current) window.clearTimeout(streakFxTimerRef.current);
    streakFxTimerRef.current = window.setTimeout(() => setStreakFx(null), 900);

    // Notify dashboard (if open in another tab) to refetch.
    try {
      window.localStorage.setItem("dash_refresh_v1", String(Date.now()));
    } catch (_e) {}
  };

  const submitMode3Answer = async () => {
    if (!currentQuestion || mode !== "3" || mode3Feedback || isSubmitting) return;
    const raw = textAnswer.trim();
    if (!raw) return;
    setIsSubmitting(true);
    const correct = normAns(currentQuestion.correct_answer);
    const picked = normAns(raw);
    if (picked === correct) {
      setMode3Feedback("correct");
      setAnswerResult("correct");
      triggerResultFx("correct");
      const apiData = await submitSrsResult({ wordId: currentQuestion.id, correct: true });
      if (apiData) applyXpAndStreakFromApi(apiData);
      // Play pronunciation when correct
      playCurrentWord();
    } else {
      setSelected(raw);
      setMode3Feedback("wrong");
      setAnswerResult("wrong");
      triggerResultFx("wrong");
      const apiData = await submitSrsResult({ wordId: currentQuestion.id, correct: false });
      if (apiData) applyXpAndStreakFromApi(apiData);
    }
    setIsSubmitting(false);
  };

  const startSpeechInput = () => {
    if (!currentQuestion || mode !== "3" || wrongReveal || mode3Feedback) return;
    try {
      m3RecRef.current?.abort?.();
    } catch (_e) {}
    m3RecRef.current = null;
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 1600,
      maxMs: 20000,
      onDone: (text) => {
        setM3Recording(false);
        m3RecRef.current = null;
        const t = String(text || "").trim();
        if (t) setTextAnswer(t);
      },
      onError: () => {
        setM3Recording(false);
        m3RecRef.current = null;
      },
      onInterim: (t) => {
        if (t && String(t).trim()) setTextAnswer(String(t).trim());
      },
    });
    if (ctrl) {
      m3RecRef.current = ctrl;
      setM3Recording(true);
    }
  };

  const stopSpeechInput = () => {
    if (m3RecRef.current) {
      try {
        m3RecRef.current.stop();
      } catch (_e) {}
    }
  };

  useEffect(() => {
    return () => {
      try {
        m3RecRef.current?.abort?.();
      } catch (_e) {}
    };
  }, []);

  const goNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (mode === "3") {
      if (mode3Feedback) {
        try {
          m3RecRef.current?.abort?.();
        } catch (_e) {}
        m3RecRef.current = null;
        setM3Recording(false);
        if (mode3Feedback === "correct") {
          setScore((prev) => prev + 1);
        } else {
          setWrongAnswers((prev) => [
            ...prev,
            {
              id: currentQuestion.id,
              prompt: currentQuestion.prompt || "",
              yourAnswer: String(selected || textAnswer || "").trim() || "(bỏ trống)",
              correctAnswer: String(currentQuestion.correct_answer || "").trim(),
            },
          ]);
        }
        setMode3Feedback(null);
        setAnswerResult(null);
        setSelected(null);
        if (isLastQuestion) {
          markPartCompleted(section);
          setShowResult(true);
          return;
        }
        setCurrent((prev) => prev + 1);
        setTextAnswer("");
        return;
      }
      return;
    }

    if (wrongReveal) {
      setWrongAnswers((prev) => [
        ...prev,
        {
          id: currentQuestion.id,
          prompt: currentQuestion.prompt || "",
          yourAnswer: String(selected || "").trim() || "(bỏ trống)",
          correctAnswer: String(currentQuestion.correct_answer || "").trim(),
        },
      ]);
      setWrongReveal(false);
      setAnswerResult(null);
      if (isLastQuestion) {
        markPartCompleted(section);
        setShowResult(true);
        return;
      }
      setCurrent((prev) => prev + 1);
      setSelected(null);
      setTextAnswer("");
      return;
    }

    if (selected == null || selected === "") return;
    if (isSubmitting) return;

    const correct = normAns(currentQuestion.correct_answer);
    const picked = normAns(selected);

    if (picked === correct) {
      setIsSubmitting(true);
      setAnswerResult("correct");
      setWrongReveal(true);
      triggerResultFx("correct");
      submitSrsResult({ wordId: currentQuestion.id, correct: true })
        .then((apiData) => {
          if (apiData) applyXpAndStreakFromApi(apiData);
          playCurrentWord();
        })
        .finally(() => {
          window.setTimeout(() => {
            setScore((prev) => prev + 1);
            setWrongReveal(false);
            setAnswerResult(null);
            if (isLastQuestion) {
              markPartCompleted(section);
              setShowResult(true);
              setIsSubmitting(false);
              return;
            }
            setCurrent((prev) => prev + 1);
            setSelected(null);
            setTextAnswer("");
            setIsSubmitting(false);
          }, 700);
        });
      return;
    }

    setIsSubmitting(true);
    setAnswerResult("wrong");
    setWrongReveal(true);
    triggerResultFx("wrong");
    submitSrsResult({ wordId: currentQuestion.id, correct: false })
      .then((apiData) => {
        if (apiData) applyXpAndStreakFromApi(apiData);
      })
      .finally(() => {
      setIsSubmitting(false);
    });
  };

  const restartQuiz = () => {
    loadRound(mode, section);
  };

  const optionLabels = ["A", "B", "C", "D"];

  const speakEnglish = (text) => {
    if (!text) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const playCurrentWord = () => {
    if (!currentQuestion) return;
    const audioUrl = currentQuestion.audio_url || "";
    const speakText =
      mode === "2" || mode === "3"
        ? currentQuestion.correct_answer || ""
        : currentQuestion.prompt || currentQuestion.correct_answer || "";

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        if (speakText) speakEnglish(speakText);
      });
      return;
    }

    if (speakText) speakEnglish(speakText);
  };

  /** Việt → Anh: phát từng đáp án (file âm thanh hoặc TTS). */
  const playOptionWord = (choice) => {
    const word = getChoiceWord(choice);
    if (!word) return;
    const audioUrl =
      choice && typeof choice === "object" && choice.audio_url ? String(choice.audio_url).trim() : "";

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakEnglish(String(word)));
      return;
    }
    speakEnglish(String(word));
  };

  return (
    <main
      className={`quiz-route ${resultFx ? `quiz-route--${resultFx}` : ""}`}
      data-mode={mode}
      data-m3={mode === "3" ? (mode3Feedback ? "done" : "idle") : "na"}
    >
      <div className="quiz-bubbles" aria-hidden />
      <section className="quizCard quiz-layout">
        <aside className="leftMenu">
          <h3>Chế độ</h3>
          <button className={`modeBtn ${mode === "1" ? "active" : ""}`} onClick={() => { setSection(1); setMode("1"); }}>
            1. Anh → Việt
          </button>
          <button className={`modeBtn ${mode === "2" ? "active" : ""}`} onClick={() => { setSection(1); setMode("2"); }}>
            2. Việt → Anh
          </button>
          <button className={`modeBtn ${mode === "3" ? "active" : ""}`} onClick={() => { setSection(1); setMode("3"); }}>
            3. Nghe & trả lời
          </button>
        </aside>

        <div>
        <h1>Kids Quiz Time</h1>
        <div className="quizStatusBar">
          <div className="quizStatusPill" aria-label="Tổng XP">
            <span className="quizStatusKey">XP</span>
            <span className="quizStatusVal">{xpTotal != null ? xpTotal : "—"}</span>
          </div>
          <div className="quizStatusPill" aria-label="Level hiện tại">
            <span className="quizStatusKey">Lv</span>
            <span className="quizStatusVal">{level != null ? level : "—"}</span>
          </div>
          <div
            className={`quizStatusPill quizStatusPill--streak ${streakFx === "up" ? "streakUp" : ""} ${
              streakFx === "reset" ? "streakReset" : ""
            }`}
            aria-label="Chuỗi ngày học liên tiếp"
          >
            <span className="quizStatusKey">🔥</span>
            <span className="quizStatusVal">{streak}</span>
          </div>
          {xpToast ? (
            <div className="quizXpToast" aria-live="polite">
              +{xpToast.delta} XP
            </div>
          ) : null}
        </div>
        <p className="subtitle">Phần thi {section}/{totalSections} - mỗi phần 10 từ</p>

        <div className="partsToolbar">
          <button
            type="button"
            className="partsArrow"
            onClick={() => setSection((s) => Math.max(1, s - 1))}
            disabled={section <= 1}
            aria-label="Phần trước"
          >
            ◀
          </button>
          <label className="partsSelectWrap">
            <span className="sr-only">Chọn phần thi</span>
            <select
              className="partsSelect"
              value={section}
              onChange={(e) => setSection(Number(e.target.value))}
              aria-label="Danh sách phần P1 đến P60"
            >
              {Array.from({ length: totalSections }).map((_, idx) => {
                const part = idx + 1;
                const done = Boolean(completedParts[part]);
                return (
                  <option key={part} value={part}>
                    Phần P{part}
                    {done ? " ✓" : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            className="partsArrow"
            onClick={() => setSection((s) => Math.min(totalSections, s + 1))}
            disabled={section >= totalSections}
            aria-label="Phần sau"
          >
            ▶
          </button>
        </div>

        {loading ? (
          <p className="subtitle">Đang tải câu hỏi...</p>
        ) : quizError ? (
          <div className="resultBox" style={{ maxWidth: "520px", margin: "1rem auto" }}>
            <h2>Không chơi Quiz được</h2>
            <p className="subtitle">{quizError}</p>
            <button type="button" className="nextBtn" onClick={() => loadRound(mode, section)}>
              Thử lại
            </button>
          </div>
        ) : !quizData.length ? (
          <p className="subtitle">Không có câu hỏi trong phần này.</p>
        ) : !showResult ? (
          <>
            <p className="subtitle">
              {mode === "1"
                ? "Chọn nghĩa tiếng Việt đúng"
                : mode === "2"
                ? "Chọn từ tiếng Anh đúng"
                : "Nghe phát âm và trả lời bằng tiếng Anh"}
            </p>

            <div className="progressWrap">
              <div className="progressBar" style={{ width: `${progress}%` }} />
            </div>
            <p className="progressText">
              Câu hỏi {current + 1}/{quizData.length}
            </p>

            <QuizMascot />
            <div className="wordBox wordBox--visual">{currentQuestion?.prompt}</div>
            {mode === "1" ? <p className="subtitle">{currentQuestion?.ipa || ""}</p> : null}
            {mode === "1" ? (
              <>
                <p className="subtitle">{currentQuestion?.question_text || ""}</p>
                <p className="subtitle">{currentQuestion?.example_sentence || ""}</p>
              </>
            ) : null}
            {mode === "1" ? null : null}

            {mode !== "3" ? (
              mode === "2" ? (
                <div className="choiceGrid choiceGrid--stacked">
                  {(currentQuestion?.options || []).map((choice, index) => {
                    const word = getChoiceWord(choice);
                    const ipa = choice && typeof choice === "object" ? choice.ipa || "" : "";
                    const isSelected = selected === word;
                    const showCorrect = wrongReveal && isChoiceCorrect(choice);
                    const showWrongPick = wrongReveal && isSelected && !isChoiceCorrect(choice);
                    let btnClass = "choiceBtn choiceBtn--block";
                    if (showCorrect) btnClass += " choiceBtn--correctReveal";
                    else if (showWrongPick) btnClass += " choiceBtn--wrongPick";
                    else if (isSelected && !wrongReveal) btnClass += " selected";

                    return (
                      <div
                        className="choiceCell"
                        key={`${current}-${index}-${String(word ?? "").slice(0, 48)}`}
                      >
                        <button
                          type="button"
                          className={btnClass}
                          onClick={() => handleChoiceClick(choice)}
                          disabled={wrongReveal || isSubmitting}
                        >
                          <span className="choiceBtn-top">
                            <span className="optLabel">{optionLabels[index] || "?"}.</span>
                            <span className="choiceWord-text">{word}</span>
                          </span>
                          {ipa ? <span className="choiceIpa">{ipa}</span> : null}
                        </button>
                        {null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="choiceGrid">
                  {(currentQuestion?.options || []).map((choice, index) => {
                    const isSelected = selected === choice;
                    const showCorrect = wrongReveal && isChoiceCorrect(choice);
                    const showWrongPick = wrongReveal && isSelected && !isChoiceCorrect(choice);

                    let className = "choiceBtn";
                    if (showCorrect) className += " choiceBtn--correctReveal";
                    else if (showWrongPick) className += " choiceBtn--wrongPick";
                    else if (isSelected && !wrongReveal) className += " selected";

                    return (
                      <button
                        key={`${current}-${index}-${String(choice ?? "").slice(0, 48)}`}
                        type="button"
                        className={className}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={wrongReveal || isSubmitting}
                      >
                        <span className="optLabel">{optionLabels[index] || "?"}.</span> {choice}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="choiceGrid" style={{ gridTemplateColumns: "1fr" }}>
                <input
                  className={`choiceBtn choiceInputPlain ${mode3Feedback === "wrong" ? "choiceInputPlain--wrongLine" : ""}`}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (!mode3Feedback && textAnswer.trim() && !isSubmitting) {
                      submitMode3Answer();
                    }
                  }}
                  placeholder="Nhập câu trả lời tiếng Anh..."
                  disabled={Boolean(mode3Feedback) || isSubmitting}
                />
                {mode3Feedback ? (
                  <div className="dictationCorrectLine">
                    <p>
                      Đáp án đúng: <strong>{String(currentQuestion?.correct_answer || "").trim()}</strong>
                    </p>
                    {mode3Feedback === "wrong" ? (
                      <p className="dictationInlineFeedback dictationInlineFeedback--wrong">😅 Ôi sai rồi</p>
                    ) : null}
                    {mode3Feedback === "correct" ? (
                      <p className="dictationInlineFeedback dictationInlineFeedback--great">⭐ Bạn quá xuất sắc!</p>
                    ) : null}
                    <div className="dictationRevealInline">
                      {currentQuestion?.ipa ? <p>{currentQuestion.ipa}</p> : null}
                      {currentQuestion?.question_text ? <p>{currentQuestion.question_text}</p> : null}
                      {currentQuestion?.example_sentence ? (
                        <p className="dictationExampleRow">
                          <span className="dictationExampleText">{currentQuestion.example_sentence}</span>
                          <button
                            type="button"
                            className="dictationExamplePlay"
                            onClick={() => speakEnglish(String(currentQuestion.example_sentence || "").trim())}
                            disabled={isSubmitting}
                            aria-label="Đọc câu ví dụ"
                            title="Đọc câu ví dụ"
                          >
                            🔊 Play câu
                          </button>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {!mode3Feedback ? (
                  <>
                    <button
                      type="button"
                      className="choiceBtn choiceBtn--recordAnswer"
                      onClick={m3Recording ? stopSpeechInput : startSpeechInput}
                      disabled={isSubmitting}
                    >
                      {m3Recording ? "⏹ Dừng ghi" : "🎤 Ghi câu trả lời"}
                    </button>
                    {textAnswer.trim() ? (
                      <button
                        type="button"
                        className="choiceBtn choiceBtn--submitAnswer"
                        onClick={submitMode3Answer}
                        disabled={isSubmitting || !textAnswer.trim()}
                      >
                        ✅ Kiểm tra đáp án
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}

            {wrongReveal && mode !== "3" && answerResult === "wrong" ? (
              <div className="quizFeedbackWrong" role="status">
                <span className="quizFeedbackWrong-emoji" aria-hidden>
                  😢
                </span>
                <p className="quizFeedbackWrong-text">Ôi!! Sai mất rồi</p>
              </div>
            ) : null}
            {wrongReveal && mode !== "3" && answerResult === "correct" ? (
              <div className="quizFeedbackGreat" role="status">
                <span className="quizFeedbackGreat-emoji" aria-hidden>
                  ⭐
                </span>
                <p className="quizFeedbackGreat-text">Đúng rồi!</p>
              </div>
            ) : null}
            {mode === "3" && !mode3Feedback ? (
              <p className="subtitle" style={{ marginTop: "0.35rem", marginBottom: "0.5rem" }}>
                Ghi âm hoặc gõ đáp án, bấm «Kiểm tra đáp án», sau đó bấm «Câu tiếp» để qua câu sau.
              </p>
            ) : null}

            {mode === "3" && !mode3Feedback ? null : (
              <button
                type="button"
                className="nextBtn"
                onClick={goNext}
                disabled={isSubmitting || (mode === "3" ? !mode3Feedback : false)}
              >
                {mode === "3"
                  ? isLastQuestion
                    ? "Xem kết quả"
                    : "Câu tiếp theo"
                  : wrongReveal
                  ? isLastQuestion
                    ? "Xem kết quả"
                    : "Câu tiếp theo"
                  : isLastQuestion
                  ? "Hoàn thành"
                  : "Câu tiếp"}
              </button>
            )}
          </>
        ) : (
          <div className="resultBox">
            <h2>{score >= 7 ? "🎉 Tuyệt vời!" : "💪 Cố gắng thêm!"}</h2>
            <p>
              Điểm của bạn: <strong>{score}</strong> / {quizData.length}
            </p>
            <p>
              {score >= 7
                ? "Bạn làm rất tốt, hãy giữ phong độ!"
                : "Bạn cần luyện thêm: nghe phát âm kỹ hơn và đọc lại chậm, rõ."}
            </p>
            {wrongAnswers.length ? (
              <div className="wrongList">
                <h3>Câu trả lời sai ({wrongAnswers.length})</h3>
                {wrongAnswers.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="wrongItem">
                    <p>
                      <strong>Câu {index + 1}:</strong> {item.prompt}
                    </p>
                    <p>
                      Bạn chọn: <span className="bad">{item.yourAnswer}</span>
                    </p>
                    <p>
                      Đáp án đúng: <span className="good">{item.correctAnswer}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="allCorrect">Bạn đã trả lời đúng tất cả câu hỏi trong phần này!</p>
            )}
            <button type="button" className="nextBtn" onClick={restartQuiz}>
              Chơi lại
            </button>
            {section < totalSections ? (
              <button
                type="button"
                className="nextBtn"
                onClick={() => setSection((prev) => Math.min(prev + 1, totalSections))}
                style={{ marginLeft: "0.4rem" }}
              >
                Sang phần kế tiếp
              </button>
            ) : null}
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
