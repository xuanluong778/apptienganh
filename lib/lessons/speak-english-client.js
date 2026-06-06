/**
 * Browser English TTS for lessons chat — voice pick + queue to reduce choppy/overlap.
 */

let voiceList = [];
let voiceInit = false;

function initVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  voiceList = (window.speechSynthesis.getVoices?.() || []).filter((v) =>
    String(v.lang || "").toLowerCase().startsWith("en")
  );
  voiceInit = voiceList.length > 0;
}

function pickEnglishVoice() {
  if (!voiceInit) initVoices();
  const prefer = voiceList.find((v) =>
    /google us english|microsoft (zira|david)|samantha|jenny|aria|english \(united states\)/i.test(
      String(v.name || "")
    )
  );
  return prefer || voiceList.find((v) => v.lang.toLowerCase().startsWith("en-us")) || voiceList[0] || null;
}

function cleanForSpeech(text) {
  return String(text || "")
    .replace(/<\/?english>/gi, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]?/g);
  if (!parts?.length) return text ? [text] : [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

let speakChain = Promise.resolve();

export function speakEnglishText(text, rate = 0.92) {
  const cleaned = cleanForSpeech(text);
  if (!cleaned || typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }

  const chunks = splitSentences(cleaned);
  if (!chunks.length) return Promise.resolve();

  speakChain = speakChain
    .then(() => {
      try {
        window.speechSynthesis.cancel();
      } catch (_e) {
        /* ignore */
      }
      return new Promise((resolve) => window.setTimeout(resolve, 80));
    })
    .then(() => {
      if (!voiceInit) {
        initVoices();
        if (!voiceInit) {
          return new Promise((resolve) => {
            const onVoices = () => {
              window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
              initVoices();
              resolve();
            };
            window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
            window.setTimeout(() => {
              window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
              initVoices();
              resolve();
            }, 400);
          });
        }
      }
      return undefined;
    })
    .then(() => {
      const voice = pickEnglishVoice();
      return chunks.reduce(
        (chain, chunk) =>
          chain.then(
            () =>
              new Promise((resolve) => {
                const u = new SpeechSynthesisUtterance(chunk);
                u.lang = voice?.lang || "en-US";
                if (voice) u.voice = voice;
                u.rate = Math.max(0.75, Math.min(1.05, rate));
                u.pitch = 1;
                u.volume = 1;
                u.onend = () => resolve();
                u.onerror = () => resolve();
                try {
                  window.speechSynthesis.speak(u);
                } catch (_err) {
                  resolve();
                }
              })
          ),
        Promise.resolve()
      );
    })
    .catch(() => {});

  return speakChain;
}

export function stopEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_e) {
    /* ignore */
  }
  speakChain = Promise.resolve();
}

if (typeof window !== "undefined") {
  initVoices();
  window.speechSynthesis?.addEventListener?.("voiceschanged", initVoices);
}
