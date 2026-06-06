"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { evaluatePronunciation } from "@/lib/client-pronunciation-eval";
import { primeMicrophone, speechErrorVi } from "@/lib/kids-vocabulary/speech-score-helpers";
import styles from "./KidsVocabulary.module.css";

function createMediaRecorder(stream) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus"];
  for (const mimeType of preferred) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      try {
        return new MediaRecorder(stream, { mimeType });
      } catch (_e) {
        /* try next */
      }
    }
  }
  try {
    return new MediaRecorder(stream);
  } catch (_e) {
    return null;
  }
}

function micErrorMessage(err) {
  const name = err && typeof err === "object" ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Micro bị chặn — bé bấm biểu tượng khóa trên thanh địa chỉ → Cho phép micro.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Không thấy micro — cắm micro hoặc bật micro máy.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Micro đang bị app khác dùng — tắt họp/Zoom rồi thử lại.";
  }
  if (name === "SecurityError" || name === "NotSupportedError") {
    return "Trình duyệt chặn micro trên HTTP — mở bằng https:// hoặc http://localhost:3000 (Laragon: bật SSL cho site).";
  }
  return "Không mở được micro — thử trình duyệt khác (Chrome/Edge).";
}

/** Ghi âm + tự dừng khi ngắt nói + chấm điểm (Web Speech, không lưu file). */
function AutoSpeechScoreBlock({ label, resetKey, disabled, target, isSentence, compact = false }) {
  const [phase, setPhase] = useState("idle"); // idle | listening | scored
  const [interim, setInterim] = useState("");
  const [resultText, setResultText] = useState("");
  const [resultKind, setResultKind] = useState(""); // ok | warn | err
  const speechRef = useRef(null);

  const resetLocal = useCallback(() => {
    speechRef.current?.abort?.();
    speechRef.current = null;
    setPhase("idle");
    setInterim("");
    setResultText("");
    setResultKind("");
  }, []);

  useEffect(() => {
    resetLocal();
  }, [resetKey, resetLocal]);

  useEffect(
    () => () => {
      speechRef.current?.abort?.();
      speechRef.current = null;
    },
    []
  );

  async function startListen() {
    if (disabled || phase === "listening") return;
    const tgt = String(target || "").trim();
    if (!tgt) return;

    speechRef.current?.abort?.();
    speechRef.current = null;
    setResultText("");
    setResultKind("");
    setInterim("");
    setPhase("listening");

    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setPhase("idle");
      setResultKind("err");
      setResultText(speechErrorVi("unsupported"));
      return;
    }

    const micOk = await primeMicrophone();
    if (!micOk) {
      setPhase("idle");
      setResultKind("err");
      setResultText(speechErrorVi("not-allowed"));
      return;
    }

    let errFromLib = false;
    const ctrl = startPatientSpeechRecognition({
      utteranceMode: false,
      lang: "en-US",
      silenceMs: isSentence ? 3200 : 3400,
      maxMs: isSentence ? 22000 : 14000,
      noSpeechGraceMs: 4000,
      onInterim: (t) => setInterim(String(t || "").trim()),
      onDone: (t) => {
        speechRef.current = null;
        setInterim("");
        setPhase("scored");
        const trimmed = String(t || "").trim();
        const ev = evaluatePronunciation(trimmed, tgt, { isSentence });
        const pass = ev.score >= (isSentence ? 48 : 40);
        const line = `Điểm ${ev.score}/100`;
        if (!trimmed) {
          setResultKind("warn");
          setResultText(
            `${line} — Chưa nghe được. Chờ "Đang nghe…" rồi đọc to từ «${tgt}» (Chrome/Edge + micro).`
          );
          return;
        }
        if (pass) {
          setResultKind("ok");
          setResultText(`${line} — ${ev.message} 🌟`);
        } else {
          setResultKind("warn");
          setResultText(`${line} — ${ev.details || ev.message || "Thử đọc chậm theo mẫu nhé."}`);
        }
      },
      onError: (code) => {
        errFromLib = true;
        speechRef.current = null;
        setInterim("");
        setPhase("idle");
        setResultKind("err");
        setResultText(speechErrorVi(code));
      },
    });

    if (!ctrl) {
      setPhase("idle");
      if (!errFromLib) {
        setResultKind("err");
        setResultText(speechErrorVi("start-failed"));
      }
      return;
    }
    speechRef.current = ctrl;
  }

  function cancelListen() {
    speechRef.current?.abort?.();
    speechRef.current = null;
    setInterim("");
    setPhase("idle");
    setResultKind("warn");
    setResultText("Đã hủy. Bấm Ghi âm khi sẵn sàng đọc.");
  }

  function mainAction() {
    if (disabled) return;
    if (phase === "listening") {
      cancelListen();
      return;
    }
    if (phase === "scored") {
      resetLocal();
      return;
    }
    void startListen();
  }

  const mainLabel =
    phase === "listening" ? "⏹ Hủy" : phase === "scored" ? "🔄 Thử lại" : "⏺ Ghi âm";

  const resultCls =
    resultKind === "ok" ? styles.recScoreOk : resultKind === "warn" ? styles.recScoreWarn : resultKind === "err" ? styles.recErr : "";

  return (
    <div className={styles.recWrap}>
      <p className={styles.recLabel}>{label}</p>
      {!compact ? (
        <p className={styles.recHint}>
          Bấm Ghi âm → đọc to → khi bạn ngừng một nhịp máy tự dừng và chấm điểm (Chrome/Edge + mạng).
        </p>
      ) : null}
      <div className={styles.row} style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
        <button
          type="button"
          className={`${styles.bigBtn} ${phase === "listening" ? styles.bigBtnPrimary : styles.bigBtnGhost}`}
          disabled={disabled}
          onClick={mainAction}
        >
          {phase === "listening" ? "⏳ Đang nghe… (bấm để hủy)" : mainLabel}
        </button>
      </div>
      {phase === "listening" ? (
        <p className={styles.recInterim}>
          {interim ? `Đang nghe: ${interim}` : `Đọc to: «${target}»…`}
        </p>
      ) : null}
      {resultText ? <p className={resultCls || styles.recScoreWarn}>{resultText}</p> : null}
    </div>
  );
}

/**
 * @param {{ label?: string, resetKey?: string, disabled?: boolean, scoreTarget?: string, scoreAsSentence?: boolean }} props
 * — Nếu có `scoreTarget`: tự dừng + chấm điểm (Web Speech). Không có: ghi âm file (MediaRecorder) như cũ.
 */
export default function RecordPlaybackButtons({
  label = "Ghi âm",
  resetKey = "",
  disabled = false,
  scoreTarget = "",
  scoreAsSentence = false,
  compact = false,
}) {
  const useAutoScore = Boolean(String(scoreTarget || "").trim());

  if (useAutoScore) {
    return (
      <AutoSpeechScoreBlock
        label={label}
        resetKey={resetKey}
        disabled={disabled}
        target={String(scoreTarget).trim()}
        isSentence={Boolean(scoreAsSentence)}
        compact={compact}
      />
    );
  }

  const [phase, setPhase] = useState("idle");
  const [err, setErr] = useState("");
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const urlRef = useRef(null);
  const audioRef = useRef(null);
  const discardStopRef = useRef(false);
  const recMimeRef = useRef("");

  const stopStream = useCallback(() => {
    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch (_e) {}
    streamRef.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const hardReset = useCallback(() => {
    try {
      audioRef.current?.pause?.();
    } catch (_e) {}
    audioRef.current = null;
    revokeUrl();
    blobRef.current = null;
    chunksRef.current = [];
    recorderRef.current = null;
    recMimeRef.current = "";
    setPhase("idle");
    setErr("");
    stopStream();
  }, [revokeUrl, stopStream]);

  useEffect(() => {
    discardStopRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch (_e) {
        hardReset();
      }
    } else {
      hardReset();
    }
  }, [resetKey, hardReset]);

  useEffect(
    () => () => {
      discardStopRef.current = true;
      try {
        recorderRef.current?.stop?.();
      } catch (_e) {}
      hardReset();
    },
    [hardReset]
  );

  async function startRecording() {
    if (disabled || typeof window === "undefined") return;
    setErr("");
    discardStopRef.current = false;
    try {
      audioRef.current?.pause?.();
    } catch (_e) {}
    revokeUrl();
    blobRef.current = null;
    chunksRef.current = [];
    recMimeRef.current = "";
    stopStream();

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (e2) {
        setErr(micErrorMessage(e2 || e1));
        return;
      }
    }

    streamRef.current = stream;
    const rec = createMediaRecorder(stream);
    if (!rec) {
      setErr("Trình duyệt không hỗ trợ ghi âm (MediaRecorder).");
      stopStream();
      return;
    }
    recorderRef.current = rec;
    recMimeRef.current = rec.mimeType || "";

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onerror = () => {
      setErr("Ghi âm lỗi — thử lại.");
      discardStopRef.current = true;
      hardReset();
    };
    rec.onstop = () => {
      const mimeGuess = recMimeRef.current || rec.mimeType || "";
      try {
        streamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch (_e) {}
      streamRef.current = null;
      recorderRef.current = null;

      if (discardStopRef.current) {
        discardStopRef.current = false;
        chunksRef.current = [];
        revokeUrl();
        blobRef.current = null;
        setPhase("idle");
        setErr("");
        recMimeRef.current = "";
        return;
      }

      const parts = chunksRef.current;
      chunksRef.current = [];
      const blobType = mimeGuess || parts[0]?.type || "audio/webm";
      const blob = new Blob(parts, { type: blobType });
      if (!blob.size) {
        setErr("Chưa thu được âm thanh — bấm Ghi âm, đọc to vài giây rồi bấm Dừng ghi.");
        setPhase("idle");
        recMimeRef.current = "";
        return;
      }
      blobRef.current = blob;
      revokeUrl();
      urlRef.current = URL.createObjectURL(blob);
      setPhase("recorded");
    };

    try {
      rec.start();
      setPhase("recording");
    } catch (_e) {
      setErr("Không bắt đầu được ghi âm — thử lại.");
      discardStopRef.current = true;
      try {
        rec.stop();
      } catch (_e2) {}
      hardReset();
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      setPhase((p) => (p === "recording" ? "idle" : p));
      stopStream();
      return;
    }
    discardStopRef.current = false;
    try {
      if (rec.state === "recording" && typeof rec.requestData === "function") {
        rec.requestData();
      }
    } catch (_e) {}
    try {
      rec.stop();
    } catch (_e) {
      discardStopRef.current = true;
      hardReset();
    }
  }

  function toggleRecord() {
    if (disabled) return;
    if (phase === "recording") stopRecording();
    else void startRecording();
  }

  function playBack() {
    if (disabled || phase !== "recorded") return;
    const url = urlRef.current || (blobRef.current ? URL.createObjectURL(blobRef.current) : null);
    if (!url) return;
    urlRef.current = url;
    try {
      audioRef.current?.pause?.();
    } catch (_e) {}
    const a = new Audio(url);
    audioRef.current = a;
    void a.play().catch(() => {
      setErr("Không phát được bản ghi — thử ghi lại (Chrome/Edge).");
    });
  }

  const recLabel = phase === "recording" ? "⏹ Dừng ghi" : "⏺ Ghi âm";

  return (
    <div className={styles.recWrap}>
      <p className={styles.recLabel}>{label}</p>
      <p className={styles.recHint}>Bấm Ghi âm → đọc to → bấm Dừng ghi → Nghe bản ghi.</p>
      <div className={styles.row} style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
        <button
          type="button"
          className={`${styles.bigBtn} ${phase === "recording" ? styles.bigBtnPrimary : styles.bigBtnGhost}`}
          disabled={disabled}
          onClick={toggleRecord}
        >
          {recLabel}
        </button>
        <button
          type="button"
          className={`${styles.bigBtn} ${styles.bigBtnGhost}`}
          disabled={disabled || phase !== "recorded"}
          onClick={playBack}
        >
          🔁 Nghe bản ghi
        </button>
      </div>
      {err ? <p className={styles.recErr}>{err}</p> : null}
    </div>
  );
}
