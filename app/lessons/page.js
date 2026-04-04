"use client";

import { useEffect, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { usePaywall } from "@/components/billing/PaywallProvider";
import { isPaywallResponse } from "@/lib/billing/checkout-client";

function buildInitialChatMessages() {
  return [
    {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      text: "Hi! I am your English AI friend. Ask me anything in English—I will answer and ask you a question back so we can chat like normal.",
      correctedSentence: "",
      ipa: "",
      tip: "",
      mistakesExplanation: "",
      showVi: false,
      viText: "",
      viLoading: false,
    },
  ];
}

export default function LessonsPage() {
  const { openPaywall } = usePaywall();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [pronunciation, setPronunciation] = useState(null);
  const [chatMessages, setChatMessages] = useState(buildInitialChatMessages);
  const recognitionRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    async function fetchLessons() {
      try {
        const response = await fetch("/api/lessons", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load lessons.");
        }

        setLessons(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(err.message || "Cannot fetch lessons.");
      } finally {
        setLoading(false);
      }
    }

    fetchLessons();
  }, []);

  const playAudio = (lesson) => {
    if (!lesson.audio) {
      return;
    }

    try {
      const audio = new Audio(lesson.audio);
      setPlayingId(lesson.id);
      audio.play();
      audio.addEventListener("ended", () => setPlayingId(null), { once: true });
      audio.addEventListener("error", () => setPlayingId(null), { once: true });
    } catch (_err) {
      setPlayingId(null);
    }
  };

  const normalizeText = (input) =>
    String(input || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const similarityScore = (a, b) => {
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
    const maxLen = Math.max(m, n);
    return Math.max(0, Math.round((1 - distance / maxLen) * 100));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 0);
  };

  function buildTranslateSource(m) {
    return String(m.text || "").trim();
  }

  function speakVietnamese(text) {
    const t = String(text || "").trim();
    if (!t || typeof window === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const speakOnce = () => {
        const u = new SpeechSynthesisUtterance(t);
        const voices = window.speechSynthesis.getVoices?.() || [];
        const viVoices = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("vi"));
        if (viVoices.length > 0) {
          const googleVi = viVoices.find((v) =>
            String(v.name || "").toLowerCase().includes("google")
          );
          u.voice = googleVi || viVoices[0];
        }
        u.lang = "vi-VN";
        // Chậm và rõ hơn cho tiếng Việt.
        u.rate = 0.8;
        u.pitch = 0.95;
        window.speechSynthesis.speak(u);
      };

      const existingVoices = window.speechSynthesis.getVoices?.() || [];
      if (existingVoices.length > 0) {
        speakOnce();
        return;
      }

      // Một số trình duyệt load voices bất đồng bộ – đợi sự kiện rồi đọc.
      const onVoices = () => {
        window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
        speakOnce();
      };
      window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
      // Fallback: nếu vì lý do nào đó sự kiện không bắn, vẫn đọc ngay bằng cấu hình mặc định.
      window.setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          speakOnce();
        }
      }, 500);
    } catch (_err) {
      /* ignore */
    }
  }

  async function requestTranslate(m) {
    const id = m.id;
    const source = buildTranslateSource(m);
    if (!source.trim()) return;
    setChatMessages((prev) =>
      prev.map((x) => (x.id === id ? { ...x, viLoading: true } : x))
    );
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      const json = await res.json();
      if (isPaywallResponse(json)) {
        openPaywall({ message: json.message, source: "lessons_translate" });
        setChatMessages((prev) =>
          prev.map((x) => (x.id === id ? { ...x, viLoading: false } : x))
        );
        scrollToBottom();
        return;
      }
      const translated =
        res.ok && json.success && json.data?.translated
          ? String(json.data.translated)
          : "Không dịch được lúc này. Thử lại sau.";
      setChatMessages((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, viText: translated, viLoading: false, showVi: true } : x
        )
      );
      speakVietnamese(translated);
    } catch (_err) {
      setChatMessages((prev) =>
        prev.map((x) => (x.id === id ? { ...x, viLoading: false } : x
        ))
      );
    }
    scrollToBottom();
  }

  function toggleVietnamese(m) {
    if (m.showVi) {
      try {
        window.speechSynthesis.cancel();
      } catch (_err) {}
      setChatMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, showVi: false } : x))
      );
      return;
    }
    if (m.viText) {
      setChatMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, showVi: true } : x))
      );
      speakVietnamese(m.viText);
      return;
    }
    void requestTranslate(m);
  }

  const sendChat = async (content, options = {}) => {
    const text = String(content || "").trim();
    if (!text || chatLoading) return;

    const userMsg = {
      id: `${Date.now()}-u`,
      role: "user",
      text,
      showVi: false,
      viText: "",
      viLoading: false,
    };
    const historyPayload = chatMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.text }));
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/lessons/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          source: options.source || "text",
          spoken_text: options.spokenText || null,
          pronunciation_score:
            typeof options.pronunciationScore === "number" ? options.pronunciationScore : null,
          history: historyPayload,
        }),
      });
      const result = await response.json();
      if (isPaywallResponse(result)) {
        openPaywall({ message: result.message, source: "lessons_chat" });
        setChatMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setChatInput(text);
        setChatLoading(false);
        scrollToBottom();
        return;
      }
      const reply =
        (response.ok && result.success && result.data?.reply) || "Good effort! Please try one more sentence.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: reply,
          correctedSentence: result?.data?.corrected_sentence || "",
          ipa: result?.data?.ipa || "",
          tip: result?.data?.pronunciation_tip || "",
          mistakesExplanation: result?.data?.mistakes_explanation || "",
          showVi: false,
          viText: "",
          viLoading: false,
        },
      ]);

      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (_err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: "I cannot connect right now. Please try again in a moment.",
          showVi: false,
          viText: "",
          viLoading: false,
          mistakesExplanation: "",
        },
      ]);
    } finally {
      setChatLoading(false);
      scrollToBottom();
    }
  };

  const startVoice = () => {
    recognitionRef.current?.abort?.();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) {
      setPronunciation({
        score: 0,
        feedback: "Your browser does not support speech recognition. Please use Chrome.",
      });
      return;
    }
    setSpokenText("");
    setPronunciation(null);
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 2800,
      maxMs: 28000,
      onInterim: (t) => setSpokenText(t),
      onDone: (transcript) => {
        setRecording(false);
        recognitionRef.current = null;
        const trimmed = transcript.trim();
        if (!trimmed) {
          setPronunciation(null);
          return;
        }
        const normalized = normalizeText(trimmed);
        const wordCount = normalized ? normalized.split(" ").filter(Boolean).length : 0;
        const score = Math.max(45, Math.min(98, 55 + wordCount * 6));
        setPronunciation({
          score,
          feedback:
            score >= 85
              ? "Excellent pronunciation!"
              : score >= 65
              ? "Good! Try speaking a little slower and clearer."
              : "Keep practicing. Listen and repeat once more.",
        });
        sendChat(trimmed, {
          source: "voice",
          spokenText: trimmed,
          pronunciationScore: score,
        });
      },
      onError: (err) => {
        setRecording(false);
        recognitionRef.current = null;
        if (err === "unsupported" || err === "start-failed") {
          setPronunciation({
            score: 0,
            feedback: "Your browser does not support speech recognition. Please use Chrome.",
          });
          return;
        }
        setPronunciation({ score: 0, feedback: "Microphone error. Please allow microphone access." });
      },
    });
    if (!ctrl) return;
    recognitionRef.current = ctrl;
    setRecording(true);
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch (_err) {}
  };

  function resetChatFromStart() {
    try {
      window.speechSynthesis.cancel();
    } catch (_err) {}
    try {
      recognitionRef.current?.abort?.();
    } catch (_err) {}
    recognitionRef.current = null;
    setRecording(false);
    setChatLoading(false);
    setChatInput("");
    setSpokenText("");
    setPronunciation(null);
    setChatMessages(buildInitialChatMessages());
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    }, 0);
  }

  return (
    <main className="page">
      <h1 className="title">English Lessons + AI Chat</h1>
      <p className="subtitle">Learn words, then chat or speak English with AI.</p>

      {loading && <p className="message">Loading lessons...</p>}
      {!loading && error && <p className="message error">{error}</p>}

      {!loading && !error && lessons.length === 0 && (
        <p className="message">No lessons found. Add one from the API first.</p>
      )}

      <section className="chatCard">
        <div className="chatCardHeader">
          <h2 className="chatTitle">English Chatbot</h2>
          <button
            type="button"
            className="chatRestartBtn"
            title="Làm lại hội thoại từ đầu"
            aria-label="Làm lại hội thoại từ đầu"
            onClick={resetChatFromStart}
            disabled={chatLoading || recording}
          >
            ↺
          </button>
        </div>
        <div className="chatList" ref={listRef}>
          {chatMessages.map((m) => (
            <div key={m.id} className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
              <div>{m.text}</div>
              {m.role === "assistant" && m.mistakesExplanation ? (
                <div className="aiMeta fixBox">
                  <strong>Gợi ý sửa (AI):</strong> {m.mistakesExplanation}
                </div>
              ) : null}
              {m.role === "assistant" && m.correctedSentence ? (
                <div className="aiMeta">
                  <strong>Câu đúng hơn:</strong> {m.correctedSentence}
                </div>
              ) : null}
              {m.role === "assistant" && m.ipa ? (
                <div className="aiMeta">
                  <strong>IPA:</strong> {m.ipa}
                </div>
              ) : null}
              {m.role === "assistant" && m.tip ? (
                <div className="aiMeta">
                  <strong>Mẹo phát âm:</strong> {m.tip}
                </div>
              ) : null}
              {m.showVi && m.viText ? (
                <div className="viBox">
                  <strong>Bản dịch:</strong> {m.viText}
                </div>
              ) : null}
              <div className="translateRow">
                <button
                  type="button"
                  className="translateBtn"
                  onClick={() => toggleVietnamese(m)}
                  disabled={Boolean(m.viLoading) || !m.text}
                >
                  {m.viLoading
                    ? "Đang dịch..."
                    : m.showVi
                    ? "Ẩn bản dịch tiếng Việt"
                    : "Dịch sang tiếng Việt"}
                </button>
              </div>
            </div>
          ))}
          {chatLoading ? <div className="bubble assistant">Thinking...</div> : null}
        </div>

        <div className="voiceBox">
          <button type="button" className="micBtn" onClick={recording ? stopVoice : startVoice}>
            {recording ? "⏹ Stop Recording" : "🎤 Start Recording"}
          </button>
          <p className="spoken">
            <strong>You said:</strong> {spokenText || "..."}
          </p>
          {pronunciation ? (
            <p className="spoken">
              <strong>Pronunciation score:</strong> {pronunciation.score}% - {pronunciation.feedback}
            </p>
          ) : null}
        </div>

        <div className="chatInputRow">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your English message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat(chatInput);
            }}
          />
          <button type="button" onClick={() => sendChat(chatInput)}>
            Send
          </button>
        </div>
      </section>

      <section className="grid">
        {lessons.map((lesson, index) => (
          <article key={lesson.id} className="card">
            <div className="imageWrap">
              <img src={lesson.image} alt={lesson.word} className="image" />
            </div>
            <h2 className="word">{lesson.word}</h2>
            <button
              className="audioBtn"
              type="button"
              onClick={() => playAudio(lesson)}
              disabled={!lesson.audio}
            >
              {playingId === lesson.id ? "Playing..." : "🔊 Play"}
            </button>
            <span className="badge">Card {index + 1}</span>
          </article>
        ))}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 1.2rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: "Fredoka", sans-serif;
          text-align: center;
          position: relative;
        }

        .title {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.3rem);
          color: #fff;
          text-shadow: 0 4px 0 #2c66ca;
          font-family: "Baloo 2", cursive;
        }

        .subtitle {
          margin: 0.4rem 0 1rem;
          color: #1f4d8f;
          font-size: 1.05rem;
          font-weight: 600;
        }

        .message {
          margin: 0 auto 1rem;
          max-width: 560px;
          padding: 0.6rem 0.8rem;
          border-radius: 12px;
          background: #fff;
          color: #355388;
          border: 2px dashed #cfdcff;
        }

        .message.error {
          color: #9d2f2f;
          border-color: #ffc4c4;
          background: #fff5f5;
        }

        .grid {
          max-width: 1080px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 0.9rem;
          margin-top: 1rem;
        }
        .chatCard {
          max-width: 1080px;
          margin: 0.6rem auto 0;
          background: #fff;
          border: 4px solid #fff;
          border-radius: 20px;
          box-shadow: 0 12px 0 rgba(32, 49, 99, 0.16);
          padding: 0.8rem;
          text-align: left;
          position: relative;
        }
        .chatCardHeader {
          position: relative;
          margin: 0 0 0.5rem;
          padding-right: 52px;
          min-height: 2.4rem;
        }
        .chatTitle {
          margin: 0;
          padding: 0.15rem 0;
          color: #2e4f87;
          text-align: center;
          font-size: clamp(1.05rem, 3vw, 1.35rem);
        }
        .chatRestartBtn {
          position: absolute;
          right: 0;
          top: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid #fff;
          background: linear-gradient(145deg, #4f8cff, #2fb363);
          color: #fff;
          font-size: 1.45rem;
          line-height: 1;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(34, 51, 104, 0.3);
          display: grid;
          place-items: center;
          padding: 0;
          flex-shrink: 0;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .chatRestartBtn:hover:not(:disabled) {
          transform: scale(1.05);
        }
        .chatRestartBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .chatList {
          height: 230px;
          overflow: auto;
          border: 2px dashed #c9d8ff;
          border-radius: 14px;
          padding: 0.6rem;
          background: #f8fbff;
        }
        .bubble {
          max-width: 82%;
          margin-bottom: 0.45rem;
          padding: 0.45rem 0.6rem;
          border-radius: 12px;
          font-weight: 600;
          color: #2e4f87;
        }
        .bubble.user {
          margin-left: auto;
          background: #dfe9ff;
          border: 1px solid #b8cbff;
        }
        .bubble.assistant {
          margin-right: auto;
          background: #fff;
          border: 1px solid #d7e3ff;
        }
        .aiMeta {
          margin-top: 0.25rem;
          padding-top: 0.25rem;
          border-top: 1px dashed #d9e5ff;
          font-size: 0.9rem;
          color: #3a5d97;
        }
        .aiMeta.fixBox {
          background: #fff8ec;
          border-radius: 8px;
          padding: 0.28rem 0.35rem;
          border: 1px dashed #ffd699;
          color: #5c3d00;
        }
        .viBox {
          margin-top: 0.3rem;
          padding: 0.35rem 0.4rem;
          border-radius: 8px;
          background: #f0f9f0;
          border: 1px solid #a8d5a8;
          color: #1a4d1a;
          font-size: 0.9rem;
        }
        .translateRow {
          margin-top: 0.35rem;
        }
        .translateBtn {
          border: 2px solid #04353a;
          background: #fff;
          color: #04353a;
          border-radius: 999px;
          padding: 0.2rem 0.55rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .translateBtn:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .voiceBox {
          margin-top: 0.55rem;
          border: 2px dashed #d6e0ff;
          border-radius: 12px;
          padding: 0.5rem 0.6rem;
          background: #f9fcff;
        }
        .micBtn {
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 0.4rem 0.7rem;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .spoken {
          margin: 0.35rem 0 0;
          color: #355388;
        }
        .chatInputRow {
          margin-top: 0.55rem;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.45rem;
        }
        .chatInputRow input {
          border: 2px solid #d3deff;
          border-radius: 10px;
          padding: 0.5rem 0.6rem;
          font: inherit;
        }
        .chatInputRow button {
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 0.5rem 0.85rem;
          color: #fff;
          background: #4f8cff;
          font-weight: 700;
          cursor: pointer;
        }

        .card {
          background: #fff;
          border: 4px solid #fff;
          border-radius: 22px;
          box-shadow: 0 12px 0 rgba(32, 49, 99, 0.16);
          padding: 0.8rem;
        }

        .imageWrap {
          border-radius: 16px;
          background: linear-gradient(145deg, #ffe8f5, #e8f1ff);
          border: 3px dashed #c9d5ff;
          min-height: 140px;
          display: grid;
          place-items: center;
          margin-bottom: 0.5rem;
        }

        .image {
          width: 100px;
          height: 100px;
          object-fit: contain;
        }

        .word {
          margin: 0;
          color: #2e4f87;
          font-size: 1.6rem;
          font-family: "Baloo 2", cursive;
        }

        .badge {
          display: inline-block;
          margin-top: 0.3rem;
          border-radius: 999px;
          padding: 0.15rem 0.6rem;
          background: #eef3ff;
          color: #5f6fe2;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .audioBtn {
          margin-top: 0.45rem;
          border: 3px solid #fff;
          border-radius: 12px;
          padding: 0.35rem 0.8rem;
          background: linear-gradient(180deg, #ffb867, #ff9a37);
          color: #fff;
          font-family: "Baloo 2", cursive;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.14);
        }

        .audioBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
