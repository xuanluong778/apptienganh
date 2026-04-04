"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { buildSpeechCompareDetails } from "@/lib/client-pronunciation-eval";

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MatchingPage() {
  const [items, setItems] = useState([]);
  const [wordPool, setWordPool] = useState([]);
  const [matches, setMatches] = useState({});
  const [overId, setOverId] = useState(null);
  const [section, setSection] = useState(1);
  const [totalSections, setTotalSections] = useState(100);
  const [completedParts, setCompletedParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordingId, setRecordingId] = useState(null);
  const [speechResult, setSpeechResult] = useState({});
  const recognitionRef = useRef(null);

  const isComplete = useMemo(
    () => items.length > 0 && items.every((item) => matches[item.id] === item.word),
    [matches, items]
  );

  useEffect(() => {
    const key = "matching-completed-sections";
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(parsed)) setCompletedParts(parsed);
    } catch (_error) {}
  }, []);

  function saveCompleted(next) {
    setCompletedParts(next);
    try {
      localStorage.setItem("matching-completed-sections", JSON.stringify(next));
    } catch (_error) {}
  }

  async function loadRound(targetSection = section) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/matching/round?section=${targetSection}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Cannot load matching game.");
      }
      const roundItems = Array.isArray(json.data) ? json.data : [];
      setItems(roundItems);
      setWordPool(shuffle(roundItems));
      setMatches({});
      setSpeechResult({});
      setSection(Number(json.meta?.section || targetSection));
      setTotalSections(Number(json.meta?.total_sections || 100));
    } catch (err) {
      setItems([]);
      setWordPool([]);
      setMatches({});
      setError(err.message || "Cannot load matching game.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRound(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isComplete && !completedParts.includes(section)) {
      saveCompleted([...completedParts, section]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, section]);

  function onDragStart(event, item) {
    event.dataTransfer.setData("text/plain", String(item.id));
  }

  function onDropWord(event, imageItem) {
    event.preventDefault();
    setOverId(null);
    const draggedId = Number(event.dataTransfer.getData("text/plain"));
    const draggedItem = items.find((item) => Number(item.id) === draggedId);
    if (!draggedItem || Number(draggedItem.id) !== Number(imageItem.id)) return;

    setMatches((prev) => ({ ...prev, [imageItem.id]: draggedItem.word }));
    setWordPool((prev) => prev.filter((item) => Number(item.id) !== draggedId));
  }

  function resetGame() {
    setMatches({});
    setSpeechResult({});
    setWordPool(shuffle(items));
  }

  const wrongPronunciationList = useMemo(() => {
    return items
      .map((item) => {
        const r = speechResult[item.id];
        if (!r || typeof r.score !== "number") return null;
        if (r.score >= 80) return null;
        return {
          id: item.id,
          word: item.word,
          ipa: item.ipa || `/${String(item.word || "").toLowerCase()}/`,
          score: r.score,
          transcript: r.transcript || "",
        };
      })
      .filter(Boolean);
  }, [items, speechResult]);

  function normalizeText(input) {
    return String(input || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function similarityScore(a, b) {
    const s1 = normalizeText(a);
    const s2 = normalizeText(b);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    const distance = dp[m][n];
    return Math.max(0, Math.round((1 - distance / Math.max(m, n)) * 100));
  }

  function playWord(item) {
    const url = String(item.audio_url || "").trim();
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {
        const utterance = new SpeechSynthesisUtterance(item.word || "");
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
      return;
    }
    const utterance = new SpeechSynthesisUtterance(item.word || "");
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startRecord(item) {
    recognitionRef.current?.abort?.();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) {
      setSpeechResult((prev) => ({
        ...prev,
        [item.id]: { score: 0, transcript: "", message: "Browser không hỗ trợ Speech Recognition." },
      }));
      return;
    }
    setRecordingId(item.id);
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 2800,
      maxMs: 28000,
      onDone: (transcript) => {
        const score = similarityScore(transcript, item.word);
        const mismatch = buildSpeechCompareDetails(transcript, item.word, { isSentence: false });
        const base =
          score >= 80
            ? "Phát âm rất tốt!"
            : score >= 60
            ? "Khá tốt, thử lại thêm 1 lần."
            : "Cần luyện thêm, nghe rồi đọc lại nhé.";
        const message = mismatch ? `${base} ${mismatch}` : base;
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: {
            score,
            transcript,
            message,
          },
        }));
        setRecordingId(null);
        recognitionRef.current = null;
      },
      onError: () => {
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: { score: 0, transcript: "", message: "Lỗi ghi âm. Hãy bật quyền microphone." },
        }));
        setRecordingId(null);
        recognitionRef.current = null;
      },
    });
    if (!ctrl) {
      recognitionRef.current = null;
      return;
    }
    recognitionRef.current = ctrl;
  }

  const parts = Array.from({ length: totalSections }, (_, i) => i + 1);

  return (
    <main className="page">
      {isComplete ? <div className="confetti" /> : null}
      <section className="card">
        <h1>Word Matching Game</h1>
        <p className="subtitle">Match words with pictures, practice IPA and pronunciation.</p>

        <div className="partsGrid">
          {parts.map((p) => (
            <button
              key={p}
              type="button"
              className={`partCell ${section === p ? "active" : ""} ${completedParts.includes(p) ? "done" : ""}`}
              onClick={() => loadRound(p)}
            >
              <span>{completedParts.includes(p) ? "☑" : "☐"}</span> {p}
            </button>
          ))}
        </div>

        {loading ? <p className="hint">Đang tải phần chơi...</p> : null}
        {!loading && error ? <p className="hint">{error}</p> : null}

        {!loading && !error ? (
          <div className="board">
            <div className="panel">
              <h2>Pictures + Practice</h2>
              <div className="grid">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`dropZone ${overId === item.id ? "over" : ""} ${matches[item.id] ? "matched" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setOverId(item.id);
                    }}
                    onDragLeave={() => setOverId(null)}
                    onDrop={(event) => onDropWord(event, item)}
                  >
                    <img src={item.image_url} alt={item.word} />
                    <div className="dropText">
                      {matches[item.id] ? `✅ ${matches[item.id]}` : "Drop word here"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>Words</h2>
              <div className="grid">
                {wordPool.map((item) => (
                  <div key={item.id} className="wordCardWrap">
                    <button
                      type="button"
                      draggable
                      className="wordCard"
                      onDragStart={(event) => onDragStart(event, item)}
                    >
                      {item.word}
                    </button>
                    <p className="ipa">{item.ipa || `/${String(item.word || "").toLowerCase()}/`}</p>
                    <p className="sentence">{item.example_sentence || ""}</p>
                    <div className="btnRow">
                      <button type="button" className="smallBtn" onClick={() => playWord(item)}>
                        🔊 Nghe từ
                      </button>
                      <button
                        type="button"
                        className="smallBtn recordBtn"
                        onClick={() => startRecord(item)}
                        disabled={recordingId === item.id}
                      >
                        {recordingId === item.id ? "🎙 Đang ghi..." : "🎤 Ghi âm từ"}
                      </button>
                    </div>
                    {speechResult[item.id] ? (
                      <p className="score">
                        {speechResult[item.id].score}% - {speechResult[item.id].message}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isComplete ? (
          <>
            <div className="success">🎉 Great! You finished this section.</div>
            <div className="wrongList">
              <h3>Từ đọc sai cần luyện lại</h3>
              {wrongPronunciationList.length ? (
                wrongPronunciationList.map((w) => (
                  <div key={w.id} className="wrongItem">
                    <strong>{w.word}</strong> ({w.ipa}) - điểm: {w.score}%<br />
                    <span>Bạn đọc: {w.transcript || "-"}</span>
                  </div>
                ))
              ) : (
                <p className="allGood">Tuyệt vời! Bạn không có từ nào đọc sai trong mục này.</p>
              )}
            </div>
          </>
        ) : (
          <div className="hint">Complete all 4 pairs to finish this section.</div>
        )}

        <div className="controls">
          <button type="button" className="resetBtn" onClick={resetGame}>
            Chơi lại phần này
          </button>
          {isComplete && section < totalSections ? (
            <button type="button" className="resetBtn nextBtn" onClick={() => loadRound(section + 1)}>
              Sang phần kế tiếp
            </button>
          ) : null}
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #83d6ff 55%, #76d975 100%);
          font-family: "Fredoka", sans-serif;
          position: relative;
          overflow: hidden;
        }
        .card {
          width: min(1120px, 96vw);
          background: #fff;
          border: 4px solid #fff;
          border-radius: 28px;
          box-shadow: 0 14px 0 rgba(34, 51, 104, 0.16);
          padding: 1rem;
          z-index: 1;
        }
        h1 {
          margin: 0;
          text-align: center;
          color: #fff;
          font-family: "Baloo 2", cursive;
          font-size: clamp(2rem, 5vw, 3.2rem);
          text-shadow: 0 4px 0 #2d68cb;
          background: linear-gradient(90deg, #4f8cff, #ff7eb6);
          border-radius: 18px;
        }
        .subtitle {
          text-align: center;
          color: #2f4f88;
          margin: 0.7rem 0 0.9rem;
          font-weight: 600;
        }
        .partsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
          gap: 0.35rem;
          margin-bottom: 0.75rem;
        }
        .partCell {
          border: 2px solid #cad7ff;
          background: #f4f8ff;
          color: #36558c;
          border-radius: 10px;
          font-weight: 700;
          padding: 0.24rem 0.4rem;
          cursor: pointer;
        }
        .partCell.active {
          background: #4f8cff;
          color: #fff;
          border-color: #4f8cff;
        }
        .partCell.done {
          border-color: #66c77a;
        }
        .board {
          display: grid;
          grid-template-columns: 1fr 330px;
          gap: 0.8rem;
        }
        .panel {
          background: #f8fbff;
          border: 3px dashed #cad8ff;
          border-radius: 18px;
          padding: 0.7rem;
        }
        .panel h2 {
          margin: 0 0 0.5rem;
          font-family: "Baloo 2", cursive;
          color: #315088;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .dropZone {
          min-height: 130px;
          background: #fff;
          border: 3px solid #dae5ff;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 0.55rem;
          gap: 0.25rem;
          transition: transform 0.15s ease, background 0.2s ease;
        }
        .dropZone img {
          width: 78px;
          height: 78px;
          object-fit: contain;
        }
        .dropZone.over {
          background: #f2edff;
          transform: scale(1.02);
        }
        .dropZone.matched {
          background: #ecffef;
          border-color: #65c877;
        }
        .dropText {
          color: #506aa0;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .ipa {
          margin: 0;
          color: #5f6dd8;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .sentence {
          margin: 0;
          text-align: center;
          color: #33558d;
          font-size: 0.88rem;
          min-height: 34px;
        }
        .btnRow {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .smallBtn {
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 0.28rem 0.5rem;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.86rem;
        }
        .recordBtn {
          background: #0b6b40;
        }
        .score {
          margin: 0;
          color: #325487;
          font-size: 0.82rem;
          text-align: center;
          font-weight: 600;
        }
        .wordCard {
          border: 3px solid #fff;
          border-radius: 14px;
          padding: 0.45rem 0.4rem;
          font-family: "Baloo 2", cursive;
          font-size: 1.1rem;
          color: #fff;
          cursor: grab;
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.16);
        }
        .wordCardWrap {
          background: #fff;
          border: 2px solid #dde6ff;
          border-radius: 12px;
          padding: 0.35rem;
        }
        .wordCard:nth-child(1) {
          background: linear-gradient(180deg, #6dd8ff, #4f8cff);
        }
        .wordCard:nth-child(2) {
          background: linear-gradient(180deg, #ff97c9, #ff7eb6);
        }
        .wordCard:nth-child(3) {
          background: linear-gradient(180deg, #ffc676, #ffad4b);
        }
        .wordCard:nth-child(4) {
          background: linear-gradient(180deg, #b3a4ff, #8f7cff);
        }
        .hint,
        .success {
          margin-top: 0.8rem;
          text-align: center;
          font-family: "Baloo 2", cursive;
          font-size: 1.2rem;
          color: #35558d;
        }
        .success {
          color: #2e8b57;
        }
        .wrongList {
          margin-top: 0.7rem;
          background: #fff8ec;
          border: 2px dashed #ffc97f;
          border-radius: 12px;
          padding: 0.55rem 0.7rem;
        }
        .wrongList h3 {
          margin: 0 0 0.35rem;
          color: #8b4f00;
          font-family: "Baloo 2", cursive;
        }
        .wrongItem {
          background: #fff;
          border: 1px solid #ffd79f;
          border-radius: 10px;
          padding: 0.35rem 0.5rem;
          margin-bottom: 0.3rem;
          color: #6e4200;
          font-size: 0.9rem;
        }
        .allGood {
          margin: 0;
          color: #2e8b57;
          font-weight: 700;
        }
        .controls {
          margin-top: 0.6rem;
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .resetBtn {
          border: 3px solid #fff;
          border-radius: 14px;
          padding: 0.45rem 1rem;
          color: #fff;
          font-family: "Baloo 2", cursive;
          font-size: 1.05rem;
          background: linear-gradient(180deg, #6f9dff, #4f8cff);
          box-shadow: 0 7px 0 rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }
        .nextBtn {
          background: linear-gradient(180deg, #63cf8a, #2fb363);
        }
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 10% 20%, #ff7eb6 0 8px, transparent 9px),
            radial-gradient(circle at 30% 70%, #4f8cff 0 8px, transparent 9px),
            radial-gradient(circle at 55% 25%, #ffb14d 0 8px, transparent 9px),
            radial-gradient(circle at 75% 75%, #65c877 0 8px, transparent 9px),
            radial-gradient(circle at 90% 35%, #8f7cff 0 8px, transparent 9px);
          animation: confettiFall 1.2s ease-out infinite;
          opacity: 0.8;
        }
        @media (max-width: 980px) {
          .board {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-8px);
          }
          100% {
            transform: translateY(10px);
          }
        }
      `}</style>
    </main>
  );
}
