"use client";

export function isSpeechRecognitionSupported() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

/**
 * Web Speech API: continuous + interim + hết silence thì stop;
 * utteranceMode: một lượt ngắn (có interim + chờ no-speech).
 *
 * @param {{ utteranceMode?: boolean, lang?: string, silenceMs?: number, maxMs?: number, noSpeechGraceMs?: number, onDone?: (t: string) => void, onError?: (code: string) => void, onInterim?: (t: string) => void }} opts
 * @returns {{ stop: () => void, abort: () => void } | null}
 */
export function startPatientSpeechRecognition({
  lang = "en-US",
  silenceMs = 2800,
  maxMs = 28000,
  noSpeechGraceMs = 3200,
  utteranceMode = false,
  onDone,
  onError,
  onInterim,
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    onError?.("unsupported");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRecognition();
  rec.lang = lang;
  rec.maxAlternatives = 1;
  rec.interimResults = true;

  if (utteranceMode) {
    rec.continuous = false;
  } else {
    rec.continuous = true;
  }

  let silenceTimer = null;
  let maxTimer = null;
  let aborted = false;
  let finished = false;
  let lastFullTranscript = "";
  let startedAt = Date.now();
  let noSpeechRetries = 0;

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
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        lastFullTranscript = `${lastFullTranscript} ${piece}`.trim();
      } else {
        interimTranscript += piece;
      }
    }
    const shown = `${lastFullTranscript} ${interimTranscript}`.trim();
    onInterim?.(shown);
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
    const finalText = lastFullTranscript.trim();
    done(finalText);
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
      const elapsed = Date.now() - startedAt;
      if (elapsed < noSpeechGraceMs && noSpeechRetries < 2) {
        noSpeechRetries += 1;
        startedAt = Date.now();
        try {
          rec.start();
        } catch (_) {
          clearTimers();
          done(lastFullTranscript.trim());
        }
        return;
      }
      clearTimers();
      done(lastFullTranscript.trim());
      return;
    }
    aborted = true;
    finished = true;
    clearTimers();
    onError?.(String(err || "error"));
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
    clearTimers();
    onError?.("start-failed");
    return null;
  }

  return { stop, abort };
}
