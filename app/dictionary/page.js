"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { evaluatePronunciation } from "@/lib/client-pronunciation-eval";

function speakEnglish(text, rate = 0.9) {
  if (typeof window === "undefined" || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

function toVietnamesePos(pos) {
  const p = String(pos || "").toLowerCase();
  if (p.includes("noun")) return "Danh từ";
  if (p.includes("verb")) return "Động từ";
  if (p.includes("adjective")) return "Tính từ";
  if (p.includes("adverb")) return "Trạng từ";
  return p ? p : "Từ loại";
}

export default function DictionaryLookupPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState(null);
  const [viMeaning, setViMeaning] = useState("");
  const [translating, setTranslating] = useState(false);
  const [speechResultWord, setSpeechResultWord] = useState(null);
  const [speechResultSentence, setSpeechResultSentence] = useState(null);
  const [recordingMode, setRecordingMode] = useState("");
  const [recordingHint, setRecordingHint] = useState("");
  const recognitionRef = useRef(null);
  const azureTokenRef = useRef(null);

  const qFromUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return String(new URLSearchParams(window.location.search).get("q") || "").trim();
  }, []);

  useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (!qFromUrl || qFromUrl.length < 2) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      setEntry(null);
      setViMeaning("");
      setSpeechResultWord(null);
      setSpeechResultSentence(null);
      setRecordingHint("");
      try {
        const res = await fetch(`/api/dictionary/lookup?q=${encodeURIComponent(qFromUrl)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json?.success) {
          setError(String(json?.message || "Không tra cứu được từ điển."));
          setLoading(false);
          return;
        }
        setEntry(json.data || null);
      } catch (_error) {
        if (!cancelled) setError("Lỗi kết nối. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [qFromUrl]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch (_error) {}
    };
  }, []);

  async function handleTranslate() {
    if (!entry?.word) return;
    setTranslating(true);
    try {
      const text = entry.definition
        ? `${entry.word}: ${entry.definition}`
        : `What does "${entry.word}" mean in Vietnamese?`;
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setViMeaning("Chưa dịch được lúc này. Vui lòng thử lại.");
      } else {
        setViMeaning(String(json.data?.translated || "").trim());
      }
    } catch (_error) {
      setViMeaning("Lỗi kết nối khi dịch.");
    } finally {
      setTranslating(false);
    }
  }

  async function getAzureToken() {
    const cached = azureTokenRef.current;
    if (cached && Date.now() - cached.createdAt < 9 * 60 * 1000) return cached;
    const res = await fetch("/api/pronunciation/token", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.data?.token || !json?.data?.region) return null;
    const next = {
      token: String(json.data.token),
      region: String(json.data.region),
      createdAt: Date.now(),
    };
    azureTokenRef.current = next;
    return next;
  }

  async function recognizeWithAzure(target, isSentence) {
    const auth = await getAzureToken();
    if (!auth) return null;
    const sdk = await import("microsoft-cognitiveservices-speech-sdk");
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "2800");
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "2800");
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    const paConfig = new sdk.PronunciationAssessmentConfig(
      String(target || ""),
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    paConfig.enableProsodyAssessment = Boolean(isSentence);
    paConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
              recognizer.close();
              resolve(null);
              return;
            }
            const pa = sdk.PronunciationAssessmentResult.fromResult(result);
            const score = Math.max(0, Math.round(Number(pa?.pronunciationScore || 0)));
            const transcript = String(result?.text || "").trim();
            const local = evaluatePronunciation(transcript, target, {
              isSentence,
              expectedIpaText: entry?.phonetic || "",
            });
            recognizer.close();
            resolve({
              score,
              message: local.message,
              details: local.details || `Bạn đọc: "${transcript || "..."}"`,
            });
          } catch (error) {
            recognizer.close();
            reject(error);
          }
        },
        (error) => {
          recognizer.close();
          reject(error);
        }
      );
    });
  }

  async function startRecord(targetText, mode) {
    try {
      recognitionRef.current?.abort?.();
    } catch (_error) {}
    if (recordingMode === mode && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    setRecordingMode(mode);
    setRecordingHint("Đang nghe... bấm lại để dừng.");

    try {
      const cloud = await recognizeWithAzure(targetText, mode === "sentence");
      if (cloud) {
        setRecordingMode("");
        setRecordingHint("");
        if (mode === "sentence") setSpeechResultSentence(cloud);
        else setSpeechResultWord(cloud);
        return;
      }
    } catch (_error) {}

    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 1600,
      maxMs: 15000,
      onInterim: (text) => setRecordingHint(text ? `Đang nghe: ${text}` : "Đang nghe... bấm lại để dừng."),
      onDone: (spoken) => {
        setRecordingMode("");
        setRecordingHint("");
        recognitionRef.current = null;
        const score = evaluatePronunciation(spoken, targetText, {
          isSentence: mode === "sentence",
          expectedIpaText: entry?.phonetic || "",
        });
        if (mode === "sentence") setSpeechResultSentence(score);
        else setSpeechResultWord(score);
      },
      onError: () => {
        setRecordingMode("");
        setRecordingHint("");
        recognitionRef.current = null;
        const fallback = {
          score: 0,
          message: "Chưa ghi âm được",
          details: "Cho phép micro và thử lại.",
        };
        if (mode === "sentence") setSpeechResultSentence(fallback);
        else setSpeechResultWord(fallback);
      },
    });
    if (!ctrl) {
      setRecordingMode("");
      setRecordingHint("");
      const fallback = {
        score: 0,
        message: "Trình duyệt không hỗ trợ ghi âm",
        details: "Hãy dùng Chrome hoặc Edge.",
      };
      if (mode === "sentence") setSpeechResultSentence(fallback);
      else setSpeechResultWord(fallback);
      return;
    }
    recognitionRef.current = ctrl;
  }

  return (
    <main className="dict-page">
      <section className="dict-singleCard">
        {loading ? <p className="dict-msg">Đang tra cứu...</p> : null}
        {!loading && error ? <p className="dict-msg dict-msg--error">{error}</p> : null}

        {!loading && !error && entry ? (
          <article className="dict-entry">
            <img
              className="dict-cover"
              src={`https://picsum.photos/seed/${encodeURIComponent(entry.word || query || "word")}/160/160`}
              alt={entry.word}
            />
            <div className="dict-word">{entry.word}</div>
            <div className="dict-phonetic">{entry.phonetic || "/.../"}</div>
            <div className="dict-posBadge">{toVietnamesePos(entry.partOfSpeech)}</div>
            <div className="dict-sentence">{entry.example || `${entry.word} is useful.`}</div>
            <div className="dict-sentenceIpa">{entry.phonetic || ""}</div>
            <div className="dict-question">What does "{String(entry.word || "").toLowerCase()}" mean in Vietnamese?</div>

            <button type="button" className="dict-btn dict-btn--blue" onClick={handleTranslate} disabled={translating}>
              {translating ? "Đang dịch..." : "Dịch sang tiếng Việt"}
            </button>
            {viMeaning ? <p className="dict-meaning">{viMeaning}</p> : null}

            <button type="button" className="dict-btn dict-btn--blue" onClick={() => speakEnglish(entry.word, 0.9)}>
              🔉 Nghe từ
            </button>
            <button
              type="button"
              className="dict-btn dict-btn--blue"
              onClick={() => speakEnglish(entry.example || `${entry.word} is useful.`, 0.85)}
            >
              🔉 Nghe câu ví dụ
            </button>

            <button
              type="button"
              className="dict-btn dict-btn--green"
              onClick={() => startRecord(entry.word, "word")}
              disabled={recordingMode !== "" && recordingMode !== "word"}
            >
              {recordingMode === "word" ? "⏹ Dừng ghi âm từ" : "🎤 Ghi âm từ và chấm điểm"}
            </button>
            {speechResultWord ? (
              <p className="dict-score">
                {speechResultWord.score}/100 - {speechResultWord.message}
              </p>
            ) : null}

            <button
              type="button"
              className="dict-btn dict-btn--dark"
              onClick={() => startRecord(entry.example || `${entry.word} is useful.`, "sentence")}
              disabled={recordingMode !== "" && recordingMode !== "sentence"}
            >
              {recordingMode === "sentence" ? "⏹ Dừng ghi âm câu" : "🎤 Ghi âm câu và chấm điểm"}
            </button>
            {recordingHint ? <p className="dict-hint">{recordingHint}</p> : null}
            {speechResultSentence ? (
              <p className="dict-score">
                {speechResultSentence.score}/100 - {speechResultSentence.message}
              </p>
            ) : null}
          </article>
        ) : null}
      </section>

      <style jsx>{`
        .dict-page {
          min-height: calc(100vh - 72px);
          padding: 10px 10px 96px;
        }
        .dict-singleCard {
          width: min(520px, 100%);
          margin: 0 auto;
          padding: 0;
        }
        .dict-msg {
          text-align: center;
          font-weight: 700;
          color: #2f4f88;
        }
        .dict-msg--error {
          color: #b42318;
        }
        .dict-entry {
          border-radius: 16px;
          border: 2px dotted rgba(69, 127, 255, 0.35);
          background: #fff;
          padding: 12px 12px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }
        .dict-cover {
          width: 86px;
          height: 86px;
          object-fit: cover;
          border-radius: 2px;
        }
        .dict-word {
          font-size: clamp(2rem, 4.8vw, 3rem);
          font-weight: 800;
          color: #000;
          line-height: 1.05;
        }
        .dict-phonetic {
          color: #4d63c9;
          font-weight: 700;
          font-size: 1.05rem;
        }
        .dict-posBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #9fb6d9;
          border-radius: 999px;
          background: #e6eef7;
          color: #2e4f87;
          font-weight: 700;
          padding: 2px 12px;
          font-size: 0.9rem;
        }
        .dict-sentence {
          margin-top: 2px;
          font-size: 2rem;
          line-height: 1.15;
          color: #111;
        }
        .dict-sentenceIpa {
          color: #4f65c8;
          font-weight: 700;
          font-size: 1.05rem;
        }
        .dict-question {
          color: #3f5fa9;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .dict-btn {
          border: none;
          border-radius: 12px;
          padding: 9px 16px;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
          min-width: 170px;
          box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
        }
        .dict-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .dict-btn--blue {
          background: linear-gradient(180deg, #5f99ff, #4a81e8);
        }
        .dict-btn--green {
          background: linear-gradient(180deg, #10a920, #038f15);
        }
        .dict-btn--dark {
          background: linear-gradient(180deg, #123b3d, #062327);
        }
        .dict-meaning,
        .dict-score {
          margin: 0;
          color: #2d3c4a;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .dict-hint {
          margin: 0;
          color: #245f8f;
          font-size: 0.9rem;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}
