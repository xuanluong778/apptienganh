"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import "./quiz.css";

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
  /** Sau khi chọn sai (MCQ): lần bấm tiếp theo mới qua câu sau */
  const [wrongReveal, setWrongReveal] = useState(false);
  /** Mode 3: sau «Nộp đáp án» — "wrong" | "correct"; sang câu sau khi bấm Câu tiếp */
  const [mode3Feedback, setMode3Feedback] = useState(null);
  const [m3Recording, setM3Recording] = useState(false);
  const m3RecRef = useRef(null);
  const completionKey = "quiz-completed-parts-v1";

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
    setMode3Feedback(null);
    setM3Recording(false);
    try {
      m3RecRef.current?.abort?.();
    } catch (_e) {}
    m3RecRef.current = null;
  };

  const loadRound = async (targetMode, targetSection) => {
    setLoading(true);
    setQuizError("");
    const controller = new AbortController();
    const timeoutMs = 25000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `/api/quiz/round?mode=${targetMode}&section=${targetSection}`,
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
    loadRound(mode, section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, section]);

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
    if (!currentQuestion || wrongReveal) {
      return;
    }
    setSelected(getChoiceWord(choice));
  };

  const submitMode3Answer = () => {
    if (!currentQuestion || mode !== "3" || mode3Feedback) return;
    const raw = textAnswer.trim();
    if (!raw) return;
    const correct = normAns(currentQuestion.correct_answer);
    const picked = normAns(raw);
    if (picked === correct) {
      setMode3Feedback("correct");
    } else {
      setSelected(raw);
      setMode3Feedback("wrong");
    }
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

    const correct = normAns(currentQuestion.correct_answer);
    const picked = normAns(selected);

    if (picked === correct) {
      setScore((prev) => prev + 1);
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

    setWrongReveal(true);
  };

  const restartQuiz = () => {
    loadRound(mode, section);
  };

  const optionLabels = ["A", "B", "C", "D"];

  const speakEnglish = (text) => {
    if (!text) return;
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
    <main className="quiz-route">
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

            <div className="wordBox">{currentQuestion?.prompt}</div>
            {mode === "1" ? <p className="subtitle">{currentQuestion?.ipa || ""}</p> : null}
            {mode === "1" ? (
              <>
                <p className="subtitle">{currentQuestion?.question_text || ""}</p>
                <p className="subtitle">{currentQuestion?.example_sentence || ""}</p>
              </>
            ) : null}
            {mode === "1" ? (
              <button type="button" className="nextBtn nextBtn--play" onClick={playCurrentWord}>
                🔊 Play
              </button>
            ) : null}

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
                          disabled={wrongReveal}
                        >
                          <span className="choiceBtn-top">
                            <span className="optLabel">{optionLabels[index] || "?"}.</span>
                            <span className="choiceWord-text">{word}</span>
                          </span>
                          {ipa ? <span className="choiceIpa">{ipa}</span> : null}
                        </button>
                        <button
                          type="button"
                          className="choicePlayMini"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            playOptionWord(choice);
                          }}
                          aria-label={`Nghe phát âm: ${word}`}
                        >
                          🔊 Play
                        </button>
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
                        disabled={wrongReveal}
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
                    if (!mode3Feedback && textAnswer.trim()) {
                      submitMode3Answer();
                    }
                  }}
                  placeholder="Nhập câu trả lời tiếng Anh..."
                  disabled={Boolean(mode3Feedback)}
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
                    <button
                      type="button"
                      className="dictationReadBtn"
                      onClick={() => speakEnglish(String(currentQuestion?.correct_answer || "").trim())}
                    >
                      🔊 Đọc từ
                    </button>
                  </div>
                ) : null}
                {mode3Feedback ? (
                  <div className="dictationRevealInfo">
                    {currentQuestion?.ipa ? <p>{currentQuestion.ipa}</p> : null}
                    {currentQuestion?.question_text ? <p>{currentQuestion.question_text}</p> : null}
                    {currentQuestion?.example_sentence ? <p>{currentQuestion.example_sentence}</p> : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="choiceBtn choiceBtn--recordAnswer"
                  onClick={m3Recording ? stopSpeechInput : startSpeechInput}
                  disabled={Boolean(mode3Feedback)}
                >
                  {m3Recording ? "⏹ Dừng ghi" : "🎤 Ghi câu trả lời"}
                </button>
                <button
                  type="button"
                  className="choiceBtn choiceBtn--submitAnswer"
                  onClick={submitMode3Answer}
                  disabled={Boolean(mode3Feedback) || !textAnswer.trim()}
                >
                  ✅ Nộp đáp án
                </button>
              </div>
            )}

            {wrongReveal && mode !== "3" ? (
              <div className="quizFeedbackWrong" role="status">
                <span className="quizFeedbackWrong-emoji" aria-hidden>
                  😢
                </span>
                <p className="quizFeedbackWrong-text">Ôi!! Sai mất rồi</p>
              </div>
            ) : null}
            {mode === "3" && !mode3Feedback ? (
              <p className="subtitle" style={{ marginTop: "0.35rem", marginBottom: "0.5rem" }}>
                Ghi âm hoặc gõ đáp án, bấm «Nộp đáp án», rồi bấm nút xanh để qua câu sau.
              </p>
            ) : null}

            <button
              type="button"
              className="nextBtn"
              onClick={goNext}
              disabled={mode === "3" ? !mode3Feedback : false}
            >
              {mode === "3"
                ? mode3Feedback
                  ? isLastQuestion
                    ? "Xem kết quả"
                    : "Câu tiếp theo"
                  : isLastQuestion
                  ? "Hoàn thành"
                  : "Câu tiếp"
                : wrongReveal
                ? isLastQuestion
                  ? "Xem kết quả"
                  : "Câu tiếp theo"
                : isLastQuestion
                ? "Hoàn thành"
                : "Câu tiếp"}
            </button>
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
