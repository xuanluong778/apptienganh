"use client";

import { useEffect, useMemo, useState } from "react";
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
  const completionKey = "quiz-completed-parts-v1";

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

  const handleChoiceClick = (choice) => {
    if (!currentQuestion) {
      return;
    }
    setSelected(getChoiceWord(choice));
  };

  const handleSubmitText = () => {
    if (!currentQuestion) return;
    const userAnswer = textAnswer.trim().toLowerCase();
    setSelected(userAnswer);
  };

  const startSpeechInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.start();
    rec.onresult = (event) => {
      setTextAnswer(event.results?.[0]?.[0]?.transcript || "");
    };
  };

  const goNext = () => {
    if (!selected || !currentQuestion) {
      return;
    }

    const correct = String(currentQuestion.correct_answer || "").trim().toLowerCase();
    const picked = String(selected).trim().toLowerCase();
    if (picked && picked === correct) {
      setScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [
        ...prev,
        {
          id: currentQuestion.id,
          prompt: currentQuestion.prompt || "",
          yourAnswer: String(selected || "").trim() || "(bỏ trống)",
          correctAnswer: String(currentQuestion.correct_answer || "").trim(),
        },
      ]);
    }

    if (isLastQuestion) {
      markPartCompleted(section);
      setShowResult(true);
      return;
    }

    setCurrent((prev) => prev + 1);
    setSelected(null);
    setTextAnswer("");
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

        <div className="partsGrid">
          {Array.from({ length: totalSections }).map((_, idx) => {
            const part = idx + 1;
            const isCurrent = part === section;
            const isDone = Boolean(completedParts[part]);
            return (
              <button
                key={part}
                type="button"
                className={`partCell ${isCurrent ? "current" : ""}`}
                onClick={() => setSection(part)}
                title={`Phần thi ${part}`}
              >
                <span
                  className={`partMark ${isDone || isCurrent ? "partMark--on" : ""}`}
                  aria-hidden
                />
                <span>P{part}</span>
              </button>
            );
          })}
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
            {mode !== "2" ? <p className="subtitle">{currentQuestion?.ipa || ""}</p> : null}
            {mode !== "2" ? (
              <>
                <p className="subtitle">{currentQuestion?.question_text || ""}</p>
                <p className="subtitle">{currentQuestion?.example_sentence || ""}</p>
              </>
            ) : null}
            {mode !== "2" ? (
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
                    let btnClass = "choiceBtn choiceBtn--block";
                    if (isSelected) btnClass += " selected";

                    return (
                      <div
                        className="choiceCell"
                        key={`${current}-${index}-${String(word ?? "").slice(0, 48)}`}
                      >
                        <button type="button" className={btnClass} onClick={() => handleChoiceClick(choice)}>
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

                    let className = "choiceBtn";
                    if (isSelected) className += " selected";

                    return (
                      <button
                        key={`${current}-${index}-${String(choice ?? "").slice(0, 48)}`}
                        type="button"
                        className={className}
                        onClick={() => handleChoiceClick(choice)}
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
                  className="choiceBtn"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Nhập câu trả lời tiếng Anh..."
                  disabled={selected !== null}
                />
                <button type="button" className="choiceBtn" onClick={startSpeechInput}>
                  🎤 Ghi câu trả lời
                </button>
                <button type="button" className="choiceBtn" onClick={handleSubmitText}>
                  ✅ Nộp đáp án
                </button>
              </div>
            )}

            <button type="button" className="nextBtn" onClick={goNext}>
              {isLastQuestion ? "Hoàn thành" : "Câu tiếp"}
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
