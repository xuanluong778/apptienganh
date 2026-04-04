"use client";

import { useEffect, useMemo, useState } from "react";

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
    const response = await fetch(`/api/quiz/round?mode=${targetMode}&section=${targetSection}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (response.ok && result.success) {
      setQuizData(result.data || []);
      setSection(Number(result.meta?.section || targetSection || 1));
      setTotalSections(Number(result.meta?.total_sections || 1));
    } else {
      setQuizData([]);
      setTotalSections(1);
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

  const handleChoiceClick = (choice) => {
    if (!currentQuestion) {
      return;
    }
    setSelected(choice);
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
        if (speakText) {
          const utterance = new SpeechSynthesisUtterance(speakText);
          utterance.lang = "en-US";
          utterance.rate = 0.9;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      });
      return;
    }

    if (speakText) {
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="page">
      <div className="bubbles" />
      <section className="quizCard layout">
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
                <input type="checkbox" checked={isDone || isCurrent} readOnly />
                <span>P{part}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="subtitle">Đang tải câu hỏi...</p>
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
            <p className="subtitle">{currentQuestion?.ipa || ""}</p>
            <p className="subtitle">{currentQuestion?.question_text || ""}</p>
            <p className="subtitle">{currentQuestion?.example_sentence || ""}</p>
            <button
              type="button"
              className="nextBtn"
              onClick={playCurrentWord}
            >
              🔊 Play
            </button>

            {mode !== "3" ? (
              <div className="choiceGrid">
                {(currentQuestion?.options || []).map((choice, index) => {
                  const isSelected = selected === choice;

                  let className = "choiceBtn";
                  if (isSelected) className += " selected";

                  return (
                    <button
                      key={choice}
                      type="button"
                      className={className}
                      onClick={() => handleChoiceClick(choice)}
                    >
                      <span className="optLabel">{optionLabels[index] || "?"}.</span> {choice}
                    </button>
                  );
                })}
              </div>
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

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #86dbff 55%, #79d877 100%);
          font-family: "Fredoka", sans-serif;
          position: relative;
          overflow: hidden;
        }

        .bubbles {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45) 0 20px, transparent 22px),
            radial-gradient(circle at 80% 30%, rgba(255,255,255,0.35) 0 16px, transparent 18px),
            radial-gradient(circle at 65% 75%, rgba(255,255,255,0.3) 0 22px, transparent 24px),
            radial-gradient(circle at 35% 85%, rgba(255,255,255,0.35) 0 14px, transparent 16px);
          animation: floatBg 6s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .quizCard {
          width: min(1260px, 98vw);
          background: #fff;
          border: 4px solid #fff;
          border-radius: 28px;
          box-shadow: 0 14px 0 rgba(35, 51, 104, 0.16);
          padding: 1.25rem 1.35rem 1.5rem;
          text-align: center;
          position: relative;
          z-index: 1;
          animation: popIn 0.4s ease-out;
          overflow: hidden;
        }
        .layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 1.15rem;
          align-items: start;
        }
        .leftMenu {
          background: #f7fbff;
          border: 2px dashed #c9d8ff;
          border-radius: 16px;
          padding: 0.6rem;
        }
        .modeBtn {
          width: 100%;
          margin-bottom: 0.4rem;
          border: 2px solid #0b2115;
          background: #0b2115;
          color: #fff;
          border-radius: 50px;
          padding: 0.55rem 0.65rem;
          font-weight: 700;
          cursor: pointer;
        }
        .modeBtn.active {
          background: #1f573d;
          border-color: #1f573d;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.2rem);
          color: #ffffff;
          font-family: "Baloo 2", cursive;
          text-shadow: 0 4px 0 #2b68cb;
          background: linear-gradient(90deg, #4f8cff, #ff7eb6);
          border-radius: 18px;
          padding: 0.3rem 0.6rem;
        }

        .subtitle {
          margin: 0.7rem 0 0.7rem;
          color: #2f4f87;
          font-weight: 600;
        }
        .partsGrid {
          display: grid;
          grid-template-columns: repeat(10, minmax(68px, 1fr));
          gap: 0.35rem;
          margin-bottom: 0.65rem;
          max-height: 180px;
          overflow: auto;
          padding: 0.3rem;
          border: 2px dashed #c9d8ff;
          border-radius: 12px;
          background: #f8fbff;
          width: 100%;
          box-sizing: border-box;
        }
        .partCell {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          font-size: 0.78rem;
          color: #2f4f87;
          background: #fff;
          border: 1px solid #dbe7ff;
          border-radius: 8px;
          padding: 0.25rem;
          cursor: pointer;
        }
        .partCell.current {
          border: 2px solid #4f8cff;
          background: #eaf2ff;
        }
        .partCell input {
          width: 14px;
          height: 14px;
          pointer-events: none;
        }

        .progressWrap {
          width: 100%;
          height: 14px;
          border-radius: 999px;
          background: #e7eeff;
          overflow: hidden;
        }

        .progressBar {
          height: 100%;
          background: linear-gradient(90deg, #65d3ff, #8b7cff);
          transition: width 0.3s ease;
        }

        .progressText {
          margin: 0.4rem 0 0.6rem;
          color: #4a67a0;
          font-weight: 600;
        }

        .wordBox {
          font-family: "Baloo 2", cursive;
          font-size: clamp(2rem, 6vw, 3.3rem);
          color: #2e4f88;
          margin-bottom: 0.7rem;
          animation: bounce 1.5s ease-in-out infinite;
        }

        .choiceGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          margin-bottom: 0.9rem;
        }

        .choiceBtn {
          border: 3px solid #fff;
          border-radius: 16px;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 0.65rem 0.5rem;
          cursor: pointer;
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.15);
          transition: transform 0.15s ease;
        }
        .choiceBtn.selected {
          border: 2px solid red;
        }
        .optLabel {
          font-weight: 900;
        }

        .choiceBtn:nth-child(1) { background: linear-gradient(180deg, #68d5ff, #4f8cff); }
        .choiceBtn:nth-child(2) { background: linear-gradient(180deg, #ff97c9, #ff7eb6); }
        .choiceBtn:nth-child(3) { background: linear-gradient(180deg, #ffc574, #ffab49); }
        .choiceBtn:nth-child(4) { background: linear-gradient(180deg, #b3a4ff, #8f7cff); }

        .choiceBtn:hover:enabled {
          transform: translateY(-2px) scale(1.02);
        }

        .nextBtn {
          border: 3px solid #fff;
          border-radius: 14px;
          padding: 0.45rem 1rem;
          font-family: "Baloo 2", cursive;
          font-size: 1.15rem;
          color: #fff;
          background: linear-gradient(180deg, #6f9dff, #4f8cff);
          box-shadow: 0 7px 0 rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .resultBox h2 {
          margin: 0.3rem 0 0.4rem;
          color: #2f4f88;
          font-family: "Baloo 2", cursive;
          font-size: 2rem;
        }

        .resultBox p {
          margin-bottom: 0.9rem;
          color: #3f5f96;
          font-size: 1.2rem;
        }
        .wrongList {
          margin: 0.4rem 0 1rem;
          text-align: left;
          border: 2px dashed #c9d8ff;
          border-radius: 14px;
          background: #f7fbff;
          padding: 0.65rem;
          max-height: 280px;
          overflow: auto;
        }
        .wrongList h3 {
          margin: 0 0 0.45rem;
          color: #2f4f88;
        }
        .wrongItem {
          border: 1px solid #d9e6ff;
          border-radius: 10px;
          background: #fff;
          padding: 0.45rem 0.55rem;
          margin-bottom: 0.4rem;
        }
        .wrongItem p {
          margin: 0.2rem 0;
          font-size: 0.96rem;
        }
        .bad {
          color: #cc2e2e;
          font-weight: 700;
        }
        .good {
          color: #1f7a44;
          font-weight: 700;
        }
        .allCorrect {
          color: #2b7a46 !important;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .layout {
            grid-template-columns: 1fr;
          }
          .choiceGrid {
            grid-template-columns: 1fr;
          }
          .partsGrid {
            grid-template-columns: repeat(5, minmax(58px, 1fr));
          }
        }

        @keyframes popIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes floatBg {
          from { transform: translateY(0px); }
          to { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
