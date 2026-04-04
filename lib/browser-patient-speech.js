"use client";

/**
 * Web Speech API: bật continuous + interim, chỉ kết thúc sau silenceMs không có kết quả mới,
 * hoặc khi gọi stop() / hết maxMs — tránh cắt câu khi người học ngắt hơi ngắn.
 *
 * @returns {{ stop: () => void, abort: () => void }} stop() = chốt transcript; abort() = hủy, không gọi onDone.
 */
export function startPatientSpeechRecognition({
  lang = "en-US",
  silenceMs = 2800,
  maxMs = 28000,
  onDone,
  onError,
  onInterim,
} = {}) {
  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SpeechRecognition) {
    onError?.("unsupported");
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let silenceTimer = null;
  let maxTimer = null;
  let aborted = false;
  let finished = false;
  let lastFullTranscript = "";

  const clearTimers = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    if (maxTimer) clearTimeout(maxTimer);
    maxTimer = null;
  };

  const done = (text) => {
    if (finished || aborted) return;
    finished = true;
    clearTimers();
    onDone(text);
  };

  const armSilence = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      try {
        rec.stop();
      } catch (_) {}
    }, silenceMs);
  };

  rec.onresult = (event) => {
    let t = "";
    for (let i = 0; i < event.results.length; i += 1) {
      t += event.results[i][0].transcript;
    }
    lastFullTranscript = t;
    onInterim?.(t);
    armSilence();
  };

  maxTimer = setTimeout(() => {
    try {
      rec.stop();
    } catch (_) {}
  }, maxMs);

  rec.onend = () => {
    clearTimers();
    if (aborted) return;
    done(lastFullTranscript.trim());
  };

  rec.onerror = (e) => {
    const err = e.error;
    if (err === "aborted") {
      aborted = true;
      finished = true;
      clearTimers();
      return;
    }
    if (err === "no-speech") {
      clearTimers();
      done(lastFullTranscript.trim());
      return;
    }
    aborted = true;
    finished = true;
    clearTimers();
    onError?.(err || "error");
  };

  const stop = () => {
    if (finished || aborted) return;
    clearTimers();
    try {
      rec.stop();
    } catch (_) {}
  };

  const abort = () => {
    if (finished || aborted) return;
    aborted = true;
    finished = true;
    clearTimers();
    try {
      rec.abort();
    } catch (_) {}
  };

  try {
    rec.start();
  } catch (_e) {
    aborted = true;
    finished = true;
    onError?.("start-failed");
    return null;
  }

  return { stop, abort };
}
