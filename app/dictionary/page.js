"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { evaluatePronunciation } from "@/lib/client-pronunciation-eval";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";

function speakEnglish(text, lang) {
  const t = String(text || "").trim();
  if (!t) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang === "uk" ? "en-GB" : "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (_e) {}
}

function playOrSpeak(url, text, accent) {
  const u = String(url || "").trim();
  if (u) {
    const audio = new Audio(u);
    audio.play().catch(() => speakEnglish(text, accent));
  } else {
    speakEnglish(text, accent);
  }
}

function DictionaryLookupContent() {
  const searchParams = useSearchParams();
  const qParam = String(searchParams.get("q") || "").trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [showVi, setShowVi] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [speechResult, setSpeechResult] = useState({});
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!qParam || qParam.length < 2) {
      setData(null);
      setError("");
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      setData(null);
      setShowVi(false);
      setSpeechResult({});
      try {
        const res = await fetch(`/api/dictionary/lookup?q=${encodeURIComponent(qParam)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.message || "Không tra được từ này.");
          return;
        }
        setData(json.data);
      } catch (_e) {
        if (!cancelled) setError("Lỗi mạng. Thử lại sau.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [qParam]);

  const item = data
    ? {
        id: data.id ?? `lookup-${data.word}`,
        word: data.word,
        ipa_uk: data.ipa_uk,
        ipa_us: data.ipa_us,
        audio_uk: data.audio_uk,
        audio_us: data.audio_us,
        part_of_speech: data.part_of_speech,
        part_of_speech_vi: data.part_of_speech_vi,
        example_sentence: data.example_sentence,
        example_sentence_vi: data.example_sentence_vi,
        example_sentence_ipa: data.example_sentence_ipa,
        vietnamese_meaning: data.vietnamese_meaning,
        question_text: data.question_text,
        image_url: data.image_url,
        example_audio_url: data.example_audio_url,
      }
    : null;

  function startRecordWord() {
    if (!item) return;
    recognitionRef.current?.abort?.();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) {
      setSpeechResult((prev) => ({
        ...prev,
        [item.id]: { score: 0, transcript: "", message: "Trình duyệt không hỗ trợ ghi âm." },
      }));
      return;
    }
    setRecordingId(item.id);
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 2800,
      maxMs: 28000,
      onDone: (transcript) => {
        const evaluation = evaluatePronunciation(transcript, item.word, {
          isSentence: false,
          expectedIpaText: item.ipa_us || item.ipa_uk || "",
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
          [item.id]: { score: 0, transcript: "", message: "Lỗi ghi âm." },
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

  function startRecordSentence() {
    if (!item) return;
    const key = `sentence-${item.id}`;
    recognitionRef.current?.abort?.();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) {
      setSpeechResult((prev) => ({
        ...prev,
        [key]: { score: 0, transcript: "", message: "Trình duyệt không hỗ trợ ghi âm." },
      }));
      return;
    }
    setRecordingId(key);
    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 3200,
      maxMs: 32000,
      onDone: (transcript) => {
        const evaluation = evaluatePronunciation(transcript, item.example_sentence || "", {
          isSentence: true,
          expectedIpaText: item.example_sentence_ipa || "",
        });
        setSpeechResult((prev) => ({
          ...prev,
          [key]: { ...evaluation, transcript },
        }));
        setRecordingId(null);
        recognitionRef.current = null;
      },
      onError: () => {
        setSpeechResult((prev) => ({
          ...prev,
          [key]: { score: 0, transcript: "", message: "Lỗi ghi âm." },
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

  const sameIpa = item && String(item.ipa_uk) === String(item.ipa_us);
  const diffAudio =
    item &&
    String(item.audio_uk || "").trim() &&
    String(item.audio_us || "").trim() &&
    String(item.audio_uk) !== String(item.audio_us);
  const showBothAccents = item && (!sameIpa || diffAudio);

  return (
    <main className="page">
      <h1 className="title">Tra từ điển</h1>
      <p className="sub">
        Nhập từ ở thanh tìm kiếm phía trên. Nghe phát âm Anh Anh / Anh Mỹ, xem ví dụ và luyện đọc.
      </p>

      {!qParam || qParam.length < 2 ? (
        <p className="msg">Gõ một từ tiếng Anh vào ô &quot;Từ điển&quot; trên menu rồi bấm Tra cứu.</p>
      ) : null}

      {loading ? <p className="msg">Đang tra cứu…</p> : null}
      {error ? <p className="errorMsg">{error}</p> : null}

      {item ? (
        <article className="item">
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

          {showBothAccents ? (
            <div className="accentBlock">
              <p className="ipa">
                <strong>Anh Anh (UK):</strong> {item.ipa_uk}
              </p>
              <button
                type="button"
                className="miniAudio"
                onClick={() => playOrSpeak(item.audio_uk, item.word, "uk")}
              >
                🔊 Nghe từ (UK)
              </button>
              <p className="ipa">
                <strong>Anh Mỹ (US):</strong> {item.ipa_us}
              </p>
              <button
                type="button"
                className="miniAudio"
                onClick={() => playOrSpeak(item.audio_us, item.word, "us")}
              >
                🔊 Nghe từ (US)
              </button>
            </div>
          ) : (
            <>
              <p className="ipa">{item.ipa_us || item.ipa_uk}</p>
              <div className="btnRow">
                <button
                  type="button"
                  onClick={() => playOrSpeak(item.audio_uk, item.word, "uk")}
                >
                  🔊 UK
                </button>
                <button
                  type="button"
                  onClick={() => playOrSpeak(item.audio_us, item.word, "us")}
                >
                  🔊 US
                </button>
              </div>
            </>
          )}

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
          ) : item.part_of_speech_vi ? (
            <p className="posTag">{item.part_of_speech_vi}</p>
          ) : null}

          <p className="sentence">{item.example_sentence}</p>
          <p className="sentenceIpa">{item.example_sentence_ipa || ""}</p>
          <p className="question">{item.question_text}</p>

          <button type="button" onClick={() => setShowVi((v) => !v)}>
            {showVi ? "Ẩn bản dịch tiếng Việt" : "Dịch sang tiếng Việt"}
          </button>
          {showVi ? (
            <>
              <p className="meaning">
                {item.vietnamese_meaning || "Chưa có nghĩa tiếng Việt."}
              </p>
              <p className="meaning sentenceTrans">
                {item.example_sentence_vi || "Chưa có bản dịch câu ví dụ."}
              </p>
            </>
          ) : null}

          <div className="btnRow">
            <button
              type="button"
              onClick={() => {
                const ex = item.example_audio_url;
                if (ex) {
                  new Audio(ex).play().catch(() => speakEnglish(item.example_sentence, "us"));
                } else {
                  speakEnglish(item.example_sentence, "us");
                }
              }}
            >
              🔊 Nghe câu ví dụ
            </button>
          </div>

          <button
            type="button"
            className="recordBtn"
            onClick={startRecordWord}
            disabled={recordingId === item.id}
          >
            {recordingId === item.id ? "🎙 Đang ghi âm..." : "🎤 Ghi âm từ và chấm điểm"}
          </button>
          <button
            type="button"
            className="recordBtn sentenceBtn"
            onClick={startRecordSentence}
            disabled={recordingId === `sentence-${item.id}`}
          >
            {recordingId === `sentence-${item.id}`
              ? "🎙 Đang ghi âm câu..."
              : "🎤 Ghi âm câu và chấm điểm"}
          </button>

          <ScoreBlock id={item.id} result={speechResult[item.id]} />
          <ScoreBlock id={`sentence-${item.id}`} result={speechResult[`sentence-${item.id}`]} sentence />
        </article>
      ) : null}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: "Fredoka", sans-serif;
        }
        .title {
          text-align: center;
          margin: 0;
          color: #2f4f88;
        }
        .sub {
          text-align: center;
          color: #4d67a0;
          margin: 0.4rem 0 1rem;
        }
        .msg {
          text-align: center;
          color: #355388;
        }
        .errorMsg {
          text-align: center;
          color: #b42318;
          font-weight: 700;
          background: #fff1f2;
          border: 2px dashed #fda4af;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
          max-width: 560px;
          margin: 0 auto 1rem;
        }
        .item {
          max-width: 420px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px dotted #c9d8ff;
          border-radius: 16px;
          padding: 0.6rem 0.75rem;
          text-align: center;
        }
        .item img {
          width: 88px;
          height: 88px;
          object-fit: contain;
        }
        .item h3 {
          margin: 0.2rem 0 0.1rem;
          color: #000000;
          font-size: 2rem;
        }
        .ipa {
          margin: 0.15rem 0;
          color: #5f6dd8;
          font-weight: 700;
          font-size: 0.88rem;
        }
        .accentBlock {
          text-align: left;
          margin: 0.25rem 0 0.35rem;
        }
        .miniAudio {
          border: 2px solid #4f8cff;
          border-radius: 10px;
          padding: 0.25rem 0.5rem;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          margin-bottom: 0.35rem;
        }
        .posTag {
          display: inline-block;
          margin: 0.2rem 0;
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
          font-size: 1.2rem;
          margin: 0.2rem 0;
        }
        .sentenceIpa {
          margin: 0.1rem 0;
          color: #6678b8;
          font-weight: 700;
          font-size: 0.78rem;
          min-height: 22px;
        }
        .question {
          color: #4a63a0;
          font-weight: 700;
          font-size: 0.83rem;
          margin: 0.25rem 0;
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
        .item > button:not(.recordBtn):not(.miniAudio) {
          border: 3px solid #fff;
          border-radius: 12px;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          padding: 0.4rem 0.7rem;
          cursor: pointer;
          margin-top: 0.2rem;
        }
        .btnRow {
          display: flex;
          gap: 0.28rem;
          justify-content: center;
          flex-wrap: wrap;
          margin: 0.35rem 0;
        }
        .btnRow button {
          border: 3px solid #fff;
          border-radius: 12px;
          background: #4f8cff;
          color: #fff;
          font-weight: 700;
          padding: 0.35rem 0.6rem;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .recordBtn {
          margin-top: 0.25rem;
          border: 3px solid #fff !important;
          border-radius: 12px !important;
          padding: 0.4rem 0.7rem !important;
          background: green !important;
          color: #fff !important;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          max-width: 100%;
        }
        .sentenceBtn {
          background: #0b2115 !important;
          margin-top: 0.25rem;
        }
      `}</style>
    </main>
  );
}

function ScoreBlock({ id, result, sentence }) {
  if (!result) return null;
  return (
    <div className="scoreBox">
      <p>
        {sentence ? "Điểm câu: " : "Điểm: "}
        {result.score}%
      </p>
      <p>Bạn đọc: {result.transcript || "-"}</p>
      <p>{result.message}</p>
      {result.details ? (
        <p className="detailLine">{result.details}</p>
      ) : null}
      {Array.isArray(result.phonemeGroups) && result.phonemeGroups.length ? (
        <div className="phonemePanel">
          <p className="phonemeTitle">Chi tiết phoneme (IPA tham khảo)</p>
          <p className="phonemeHint">Ô xanh ≈ khớp từ; cam/đỏ = cần luyện thêm (ước lượng từ so khớp từ, không phải Azure).</p>
          <div className="phonemeWordList">
            {result.phonemeGroups.map((group, gIdx) => (
              <div key={`${id}-g-${gIdx}`} className="phonemeWordRow">
                <p className="phonemeWordLabel">{group.word}</p>
                <div className="phonemeGrid">
                  {group.phonemes.map((p, idx) => (
                    <div
                      key={`${id}-p-${gIdx}-${idx}`}
                      className={`phonemeChip ${p.score >= 80 ? "good" : p.score >= 60 ? "mid" : "bad"}`}
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
      <style jsx>{`
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
        .detailLine {
          margin: 0.2rem 0;
          font-weight: 700;
          color: #1a4a8c;
          background: #fff;
          border-radius: 8px;
          padding: 0.25rem 0.35rem;
          border: 1px dashed #9db7ff;
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
          font-size: 0.76rem;
          color: #4a5f8f;
          font-weight: 600;
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
        .phonemeGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.22rem;
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
      `}</style>
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<p className="dict-suspense">Đang tải…</p>}>
      <DictionaryLookupContent />
    </Suspense>
  );
}
