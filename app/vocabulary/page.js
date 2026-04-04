"use client";

import { useEffect, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import {
  evaluatePronunciation,
  normalizeText,
  buildSpeechCompareDetails,
} from "@/lib/client-pronunciation-eval";

const PAGE_SIZE = 60;

export default function VocabularyPage() {
  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedPos, setSelectedPos] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [recordingId, setRecordingId] = useState(null);
  const [speechResult, setSpeechResult] = useState({});
  const [showMeaningMap, setShowMeaningMap] = useState({});
  const recognitionRef = useRef(null);
  const azureTokenRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");
      const topicQuery = selectedTopic ? `&topic=${encodeURIComponent(selectedTopic)}` : "";
      const posQuery = selectedPos ? `&pos=${encodeURIComponent(selectedPos)}` : "";
      try {
        const res = await fetch(
          `/api/vocabulary?page=${page}&limit=${PAGE_SIZE}${topicQuery}${posQuery}`,
          {
          cache: "no-store",
          }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setItems(json.data || []);
          setTotal(Number(json.pagination?.total || 0));
        } else {
          setItems([]);
          setTotal(0);
          setLoadError("Không tải được danh sách từ vựng. Vui lòng thử lại.");
        }
      } catch (_error) {
        setItems([]);
        setTotal(0);
        setLoadError("Lỗi kết nối đến máy chủ. Vui lòng tải lại trang.");
      }
      setLoading(false);
    }
    load();
  }, [page, selectedTopic, selectedPos]);

  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch("/api/vocabulary/topics", { cache: "force-cache" });
        const json = await res.json();
        if (res.ok && json.success) {
          setTopics(json.data || []);
          return;
        }
        setTopics([]);
      } catch (_error) {
        setTopics([]);
      }
    }
    loadTopics();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function getAzureToken() {
    const cached = azureTokenRef.current;
    if (cached && Date.now() - cached.createdAt < 9 * 60 * 1000) {
      return cached;
    }
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

  function parseAzureAssessment({ sdk, result, target, isSentence }) {
    const transcript = String(result?.text || "").trim();
    const pa = sdk.PronunciationAssessmentResult.fromResult(result);
    const score = Math.max(0, Math.round(Number(pa?.pronunciationScore || 0)));
    const jsonRaw = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
    let details = "";
    const phonemeRows = [];
    try {
      const parsed = JSON.parse(jsonRaw || "{}");
      const best = parsed?.NBest?.[0] || {};
      const words = Array.isArray(best.Words) ? best.Words : [];
      const errorWords = [];
      for (const w of words) {
        const et = String(w?.PronunciationAssessment?.ErrorType ?? "None");
        if (et && et !== "None" && et !== "0") {
          const wd = String(w.Word || "").trim();
          if (wd) errorWords.push(wd.toLowerCase());
        }
      }
      const weakWords = words
        .filter((w) => Number(w?.PronunciationAssessment?.AccuracyScore || 0) < 75)
        .map((w) => String(w.Word || "").toLowerCase())
        .filter(Boolean);
      const wordIssues = [...new Set([...errorWords, ...weakWords])].slice(0, 6);
      const weakPhonemes = [];
      for (const w of words) {
        const phones = Array.isArray(w?.Phonemes) ? w.Phonemes : [];
        for (const p of phones) {
          const a = Number(p?.PronunciationAssessment?.AccuracyScore || 0);
          const ph = String(p?.Phoneme || "").trim();
          if (ph) {
            phonemeRows.push({
              word: String(w?.Word || "").toLowerCase(),
              phoneme: ph,
              score: Math.max(0, Math.round(a)),
            });
            if (a < 72) weakPhonemes.push(ph);
          }
        }
      }
      const uniqWeakPhones = [...new Set(weakPhonemes)].slice(0, 8);
      if (errorWords.length) {
        details += `Azure báo lỗi phát âm tại từ: ${[...new Set(errorWords)].slice(0, 5).join(", ")}. `;
      }
      if (wordIssues.length) details += `Từ cần chỉnh: ${wordIssues.join(", ")}. `;
      if (uniqWeakPhones.length) details += `Âm (phoneme) yếu: ${uniqWeakPhones.join(", ")}. `;
    } catch (_error) {}

    const compareLine = buildSpeechCompareDetails(transcript, target, { isSentence });
    if (compareLine) {
      details = details.trim() ? `${compareLine} ${details.trim()}` : compareLine;
    } else if (score < 82 && transcript) {
      details = details.trim()
        ? `${details.trim()} So sánh với mẫu: "${String(target).trim().slice(0, 80)}${String(target).length > 80 ? "…" : ""}".`
        : `So sánh với mẫu: "${String(target).trim().slice(0, 80)}${String(target).length > 80 ? "…" : ""}".`;
    }

    const normalizedTarget = normalizeText(target);
    if (/(th)/.test(normalizedTarget) && score < 80) {
      details += " Chú ý âm /θ/ hoặc /ð/: đặt lưỡi nhẹ giữa răng.";
    }
    if (/\b\w+s\b/.test(normalizedTarget) && score < 80) {
      details += " Chú ý âm cuối -s rõ ràng.";
    }
    if (/\b\w+ed\b/.test(normalizedTarget) && score < 80) {
      details += " Chú ý đuôi -ed (/t/ /d/ /ɪd/) theo từng từ.";
    }

    const message = isSentence
      ? score >= 88
        ? "Câu đọc rất chuẩn, ngữ điệu tốt."
        : score >= 72
        ? "Khá tốt, cần mượt hơn ở vài âm."
        : "Cần luyện thêm nhịp câu và các âm yếu."
      : score >= 90
      ? "Phát âm từ rất chuẩn."
      : score >= 75
      ? "Khá chuẩn, tinh chỉnh thêm âm cuối."
      : "Cần luyện thêm từng âm vị — xem dòng \"lỗi / âm yếu\" bên dưới.";

    const phonemeGroupsMap = new Map();
    for (const row of phonemeRows) {
      const key = row.word || "(word)";
      if (!phonemeGroupsMap.has(key)) phonemeGroupsMap.set(key, []);
      phonemeGroupsMap.get(key).push(row);
    }
    const phonemeGroups = [...phonemeGroupsMap.entries()].map(([word, phonemes]) => ({
      word,
      phonemes,
    }));

    return { score, transcript, message, details: details.trim(), phonemeRows, phonemeGroups };
  }

  async function recognizeWithAzure(target, { isSentence }) {
    const auth = await getAzureToken();
    if (!auth) return null;
    const sdk = await import("microsoft-cognitiveservices-speech-sdk");
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "3500");
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "3500");
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
            const parsed = parseAzureAssessment({ sdk, result, target, isSentence });
            recognizer.close();
            resolve(parsed);
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

  function compactLabel(input, maxLen = 18) {
    const text = String(input || "").trim();
    if (text.length <= maxLen) return text;
    const sliced = text.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(" ");
    return (lastSpace > 8 ? sliced.slice(0, lastSpace) : sliced).trim();
  }

  async function startRecord(item) {
    recognitionRef.current?.abort?.();
    setRecordingId(item.id);
    try {
      const cloudResult = await recognizeWithAzure(item.word || "", { isSentence: false });
      if (cloudResult) {
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: cloudResult,
        }));
        setRecordingId(null);
        return;
      }
    } catch (_error) {}

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setSpeechResult((prev) => ({
        ...prev,
        [item.id]: {
          score: 0,
          transcript: "",
          message: "Trình duyệt không hỗ trợ Speech Recognition. Hãy dùng Chrome.",
        },
      }));
      setRecordingId(null);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch(() => {
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: {
            score: 0,
            transcript: "",
            message: "Không có quyền microphone. Hãy cho phép micro rồi thử lại.",
          },
        }));
      });

    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 2800,
      maxMs: 28000,
      onDone: (transcript) => {
        const evaluation = evaluatePronunciation(transcript, item.word, {
          isSentence: false,
          expectedIpaText: item.ipa || "",
        });
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: { ...evaluation, transcript },
        }));
        setRecordingId(null);
        recognitionRef.current = null;
      },
      onError: () => {
        setSpeechResult((prev) => ({
          ...prev,
          [item.id]: {
            score: 0,
            transcript: "",
            message: "Ghi âm lỗi. Hãy cho phép micro và đọc rõ ràng.",
          },
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

  async function startRecordSentence(item) {
    recognitionRef.current?.abort?.();
    setRecordingId(`sentence-${item.id}`);
    try {
      const cloudResult = await recognizeWithAzure(item.example_sentence || "", { isSentence: true });
      if (cloudResult) {
        setSpeechResult((prev) => ({
          ...prev,
          [`sentence-${item.id}`]: cloudResult,
        }));
        setRecordingId(null);
        return;
      }
    } catch (_error) {}

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setSpeechResult((prev) => ({
        ...prev,
        [`sentence-${item.id}`]: {
          score: 0,
          transcript: "",
          message: "Trình duyệt không hỗ trợ Speech Recognition.",
        },
      }));
      setRecordingId(null);
      return;
    }

    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 3200,
      maxMs: 32000,
      onDone: (transcript) => {
        const target = item.example_sentence || "";
        const evaluation = evaluatePronunciation(transcript, target, {
          isSentence: true,
          expectedIpaText: item.example_sentence_ipa || "",
        });
        setSpeechResult((prev) => ({
          ...prev,
          [`sentence-${item.id}`]: { ...evaluation, transcript },
        }));
        setRecordingId(null);
        recognitionRef.current = null;
      },
      onError: () => {
        setSpeechResult((prev) => ({
          ...prev,
          [`sentence-${item.id}`]: {
            score: 0,
            transcript: "",
            message: "Lỗi ghi âm. Hãy cấp quyền microphone.",
          },
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

  return (
    <main className="page">
      <section className="card">
        <h1>1000 Từ Vựng Cơ Bản</h1>
        <p className="sub">Từ vựng - IPA - Câu ví dụ - Âm thanh</p>

        {loading ? <p className="msg">Đang tải dữ liệu...</p> : null}
        {!loading && loadError ? <p className="errorMsg">{loadError}</p> : null}

        <div className="layout">
          <aside className="sidebar">
            <h3>Chủ đề</h3>
            <button
              type="button"
              className={`topicBtn ${selectedTopic === "" ? "active" : ""}`}
              onClick={() => {
                setSelectedTopic("");
                setPage(1);
              }}
            >
              Tất cả
            </button>
            {topics.map((t) => (
              <button
                key={t.topic}
                type="button"
                className={`topicBtn ${selectedTopic === t.topic ? "active" : ""}`}
                onClick={() => {
                  setSelectedTopic(t.topic);
                  setPage(1);
                }}
              >
                {compactLabel(t.topic)} ({t.total})
              </button>
            ))}

            <h3 style={{ marginTop: "0.8rem" }}>Từ loại</h3>
            <button
              type="button"
              className={`topicBtn ${selectedPos === "" ? "active" : ""}`}
              onClick={() => {
                setSelectedPos("");
                setPage(1);
              }}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`topicBtn ${selectedPos === "noun" ? "active" : ""}`}
              onClick={() => {
                setSelectedPos("noun");
                setPage(1);
              }}
            >
              Danh từ
            </button>
            <button
              type="button"
              className={`topicBtn ${selectedPos === "verb" ? "active" : ""}`}
              onClick={() => {
                setSelectedPos("verb");
                setPage(1);
              }}
            >
              Động từ
            </button>
            <button
              type="button"
              className={`topicBtn ${selectedPos === "adjective" ? "active" : ""}`}
              onClick={() => {
                setSelectedPos("adjective");
                setPage(1);
              }}
            >
              Tính từ
            </button>
          </aside>

          <div className="grid">
          {items.map((item) => (
            <article key={item.id} className="item">
              <img
                src={item.image_url}
                alt={item.word}
                onError={(event) => {
                  const target = event.currentTarget;
                  if (target.dataset.fallbackApplied === "1") return;
                  target.dataset.fallbackApplied = "1";
                  const seed = encodeURIComponent(String(item.word || "").toLowerCase());
                  target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                }}
              />
              <h3>{item.word}</h3>
              <p className="ipa">
                {item.ipa || `/${String(item.word || "").toLowerCase().trim() || "word"}/`}
              </p>
              {item.part_of_speech === "noun" ||
              item.part_of_speech === "verb" ||
              item.part_of_speech === "adjective" ? (
                <p className="posTag">
                  {item.part_of_speech === "noun"
                    ? "Danh từ"
                    : item.part_of_speech === "verb"
                    ? "Động từ"
                    : "Tính từ"}
                </p>
              ) : null}
              <p className="sentence">{item.example_sentence}</p>
              <p className="sentenceIpa">{item.example_sentence_ipa || ""}</p>
              <p className="question">{item.question_text || `What does "${item.word}" mean?`}</p>
              <button
                type="button"
                onClick={() =>
                  setShowMeaningMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                }
              >
                {showMeaningMap[item.id] ? "Ẩn bản dịch tiếng Việt" : "Dịch sang tiếng Việt"}
              </button>
              {showMeaningMap[item.id] ? (
                <>
                  <p className="meaning">
                    {item.vietnamese_meaning || "Chưa có nghĩa tiếng Việt cho từ này."}
                  </p>
                  <p className="meaning sentenceTrans">
                    {item.example_sentence_vi || "Chưa có bản dịch tiếng Việt cho câu ví dụ."}
                  </p>
                </>
              ) : null}
              <div className="btnRow">
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(item.audio_url);
                    audio.play().catch(() => {
                      const utterance = new SpeechSynthesisUtterance(item.word);
                      utterance.lang = "en-US";
                      utterance.rate = 0.9;
                      window.speechSynthesis.cancel();
                      window.speechSynthesis.speak(utterance);
                    });
                  }}
                >
                  🔊 Nghe từ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sentenceAudio = item.example_audio_url || "";
                    if (sentenceAudio) {
                      const audio = new Audio(sentenceAudio);
                      audio.play().catch(() => {
                        const utterance = new SpeechSynthesisUtterance(item.example_sentence || "");
                        utterance.lang = "en-US";
                        utterance.rate = 0.9;
                        window.speechSynthesis.cancel();
                        window.speechSynthesis.speak(utterance);
                      });
                    } else {
                      const utterance = new SpeechSynthesisUtterance(item.example_sentence || "");
                      utterance.lang = "en-US";
                      utterance.rate = 0.9;
                      window.speechSynthesis.cancel();
                      window.speechSynthesis.speak(utterance);
                    }
                  }}
                >
                  🔊 Nghe câu ví dụ
                </button>
              </div>
              <button
                type="button"
                className="recordBtn"
                onClick={() => startRecord(item)}
                disabled={recordingId === item.id}
              >
                {recordingId === item.id ? "🎙 Đang ghi âm..." : "🎤 Ghi âm từ và chấm điểm"}
              </button>
              <button
                type="button"
                className="recordBtn sentenceBtn"
                onClick={() => startRecordSentence(item)}
                disabled={recordingId === `sentence-${item.id}`}
              >
                {recordingId === `sentence-${item.id}`
                  ? "🎙 Đang ghi âm câu..."
                  : "🎤 Ghi âm câu và chấm điểm"}
              </button>
              {speechResult[item.id] ? (
                <div className="scoreBox">
                  <p>Điểm: {speechResult[item.id].score}%</p>
                  <p>Bạn đọc: {speechResult[item.id].transcript || "-"}</p>
                  <p>{speechResult[item.id].message}</p>
                  {speechResult[item.id].details ? <p>{speechResult[item.id].details}</p> : null}
                  {Array.isArray(speechResult[item.id].phonemeGroups) &&
                  speechResult[item.id].phonemeGroups.length ? (
                    <div className="phonemePanel">
                      <p className="phonemeTitle">Chi tiết phoneme</p>
                      <p className="phonemeHint">Ô xanh = ổn; cam/đỏ = âm chưa tốt (theo Azure hoặc ước lượng).</p>
                      <div className="phonemeWordList">
                        {speechResult[item.id].phonemeGroups.map((group, gIdx) => (
                          <div key={`${item.id}-word-group-${gIdx}`} className="phonemeWordRow">
                            <p className="phonemeWordLabel">{group.word}</p>
                            <div className="phonemeGrid">
                              {group.phonemes.map((p, idx) => (
                                <div
                                  key={`${item.id}-word-phoneme-${gIdx}-${idx}`}
                                  className={`phonemeChip ${
                                    p.score >= 80 ? "good" : p.score >= 60 ? "mid" : "bad"
                                  }`}
                                  title={`${p.word} - ${p.phoneme}: ${p.score}%`}
                                >
                                  <span className="ph">{p.phoneme}</span>
                                  <span className="sc">{p.score}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {speechResult[`sentence-${item.id}`] ? (
                <div className="scoreBox">
                  <p>Điểm câu: {speechResult[`sentence-${item.id}`].score}%</p>
                  <p>Bạn đọc: {speechResult[`sentence-${item.id}`].transcript || "-"}</p>
                  <p>{speechResult[`sentence-${item.id}`].message}</p>
                  {speechResult[`sentence-${item.id}`].details ? (
                    <p>{speechResult[`sentence-${item.id}`].details}</p>
                  ) : null}
                  {Array.isArray(speechResult[`sentence-${item.id}`].phonemeGroups) &&
                  speechResult[`sentence-${item.id}`].phonemeGroups.length ? (
                    <div className="phonemePanel">
                      <p className="phonemeTitle">Chi tiết phoneme</p>
                      <p className="phonemeHint">Ô xanh = ổn; cam/đỏ = âm chưa tốt (theo Azure hoặc ước lượng).</p>
                      <div className="phonemeWordList">
                        {speechResult[`sentence-${item.id}`].phonemeGroups.map((group, gIdx) => (
                          <div key={`${item.id}-sentence-group-${gIdx}`} className="phonemeWordRow">
                            <p className="phonemeWordLabel">{group.word}</p>
                            <div className="phonemeGrid">
                              {group.phonemes.map((p, idx) => (
                                <div
                                  key={`${item.id}-sentence-phoneme-${gIdx}-${idx}`}
                                  className={`phonemeChip ${
                                    p.score >= 80 ? "good" : p.score >= 60 ? "mid" : "bad"
                                  }`}
                                  title={`${p.word} - ${p.phoneme}: ${p.score}%`}
                                >
                                  <span className="ph">{p.phoneme}</span>
                                  <span className="sc">{p.score}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
          {!loading && !items.length && !loadError ? (
            <p className="msg">Không có từ vựng phù hợp bộ lọc hiện tại.</p>
          ) : null}
          </div>
        </div>

        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: "Fredoka", sans-serif;
        }
        .card {
          width: min(1100px, 96vw);
          margin: 0 auto;
          background: #fff;
          border-radius: 22px;
          border: 4px solid #fff;
          padding: 1rem;
        }
        h1 {
          text-align: center;
          margin: 0;
          color: #2f4f88;
        }
        .sub {
          text-align: center;
          color: #4d67a0;
        }
        .msg {
          text-align: center;
        }
        .errorMsg {
          text-align: center;
          color: #b42318;
          font-weight: 700;
          background: #fff1f2;
          border: 2px dashed #fda4af;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.55rem;
        }
        .layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1rem;
          align-items: start;
        }
        .sidebar {
          background: #f7fbff;
          border: 2px dashed #c9d8ff;
          border-radius: 24px;
          padding: 0.6rem;
          position: sticky;
          top: 84px;
          max-height: calc(100vh - 120px);
          overflow: auto;
        }
        .sidebar h3 {
          margin: 0 0 0.5rem;
          color: #2f4f88;
        }
        .topicBtn {
          width: 100%;
          text-align: left;
          margin-bottom: 0.35rem;
          border: 2px solid #0b2115;
          background: #ffffff;
          color: #000000;
          border-radius: 50px;
          padding: 0.55rem 0.85rem;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }
        .topicBtn:hover {
          background: #04353a;
          color: #ffffff;
          border-color: #04353a;
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .topicBtn.active {
          background: #04353a;
          color: #ffffff;
          border-color: #04353a;
        }
        .item {
          background: #ffffff;
          border: 2px dotted #c9d8ff;
          border-radius: 16px;
          padding: 0.5rem;
          text-align: center;
          min-height: 0;
        }
        img {
          width: 68px;
          height: 68px;
          object-fit: contain;
        }
        h3 {
          margin: 0.2rem 0 0.1rem;
          color: #000000;
          font-size: 2rem;
        }
        .ipa {
          margin: 0 0 0.18rem;
          color: #5f6dd8;
          font-weight: 700;
          font-size: 0.88rem;
        }
        .posTag {
          display: inline-block;
          margin: 0 0 0.2rem;
          padding: 0.08rem 0.42rem;
          border-radius: 999px;
          background: #eaf2ff;
          border: 1px solid #c9d8ff;
          color: #31558a;
          font-weight: 700;
          font-size: 0.78rem;
        }
        .sentence {
          color: #000000;
          min-height: 34px;
          font-size: 1.2rem;
          margin: 0.12rem 0;
        }
        .sentenceIpa {
          margin: 0.1rem 0 0.25rem;
          color: #6678b8;
          font-weight: 700;
          font-size: 0.78rem;
          min-height: 26px;
        }
        .question {
          color: #4a63a0;
          font-weight: 700;
          font-size: 0.83rem;
          min-height: 28px;
          margin: 0.1rem 0 0.35rem;
        }
        .meaning {
          margin: 0.25rem 0;
          padding: 0.28rem 0.4rem;
          border-radius: 10px;
          background: #f1f7ff;
          border: 2px dashed #c9d8ff;
          color: #274e85;
          font-weight: 700;
          font-size: 0.86rem;
        }
        .sentenceTrans {
          background: #fff7e8;
          border-color: #ffd699;
          color: #7a4b00;
        }
        button {
          border: 3px solid #fff;
          border-radius: 12px;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          padding: 0.4rem 0.7rem;
          cursor: pointer;
        }
        .btnRow {
          display: flex;
          gap: 0.28rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 0.2rem;
        }
        .recordBtn {
          margin-left: 0;
          margin-top: 0.25rem;
          background: green;
        }
        .sentenceBtn {
          background: #0b2115;
          margin-left: 0;
          margin-top: 0.25rem;
        }
        .scoreBox {
          margin-top: 0.35rem;
          border-radius: 10px;
          background: #eef3ff;
          border: 2px dashed #ccd8ff;
          padding: 0.35rem 0.5rem;
          color: #37558b;
          font-size: 0.88rem;
          text-align: left;
        }
        .scoreBox p {
          margin: 0.15rem 0;
        }
        .phonemePanel {
          margin-top: 0.3rem;
          border-top: 1px dashed #b8c9ff;
          padding-top: 0.3rem;
        }
        .phonemeTitle {
          margin: 0 0 0.25rem;
          font-weight: 700;
          color: #1f3f7a;
        }
        .phonemeHint {
          margin: 0 0 0.28rem;
          font-size: 0.78rem;
          color: #4a5f8f;
          font-weight: 600;
        }
        .phonemeGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.22rem;
        }
        .phonemeWordList {
          display: grid;
          gap: 0.24rem;
        }
        .phonemeWordRow {
          border: 1px dashed #bfd0ff;
          border-radius: 8px;
          padding: 0.22rem 0.3rem;
          background: #f7faff;
        }
        .phonemeWordLabel {
          margin: 0 0 0.16rem;
          color: #1e4b91;
          font-weight: 700;
          text-transform: lowercase;
        }
        .phonemeChip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border-radius: 999px;
          padding: 0.14rem 0.45rem;
          font-size: 0.78rem;
          border: 1px solid transparent;
          font-weight: 700;
        }
        .phonemeChip.good {
          background: #e9fbe9;
          color: #126a2f;
          border-color: #9be3aa;
        }
        .phonemeChip.mid {
          background: #fff8e6;
          color: #8a6200;
          border-color: #ffd36b;
        }
        .phonemeChip.bad {
          background: #ffecec;
          color: #a01f1f;
          border-color: #ffb4b4;
        }
        .phonemeChip .ph {
          font-family: "Segoe UI", "Noto Sans", sans-serif;
        }
        .phonemeChip .sc {
          opacity: 0.92;
        }
        .pager {
          margin-top: 0.8rem;
          display: flex;
          justify-content: center;
          gap: 0.6rem;
          align-items: center;
        }
        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
          .sidebar {
            position: static;
            max-height: none;
          }
        }
      `}</style>
    </main>
  );
}
