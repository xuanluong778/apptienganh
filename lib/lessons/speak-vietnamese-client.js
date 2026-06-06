/**
 * Browser Vietnamese TTS — không cần server/Laragon.
 */

let viSpeakChain = Promise.resolve();

export function getViVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => String(v.lang || "").toLowerCase().startsWith("vi"));
}

function pickViVoice() {
  const viVoices = getViVoices();
  if (!viVoices.length) return null;
  return (
    viVoices.find((v) => /google/i.test(String(v.name || ""))) ||
    viVoices.find((v) => /microsoft|online|natural|hoai|my|việt|viet/i.test(String(v.name || ""))) ||
    viVoices[0]
  );
}

function waitForVoices(ms = 800) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }
  if (getViVoices().length) return Promise.resolve(true);

  return new Promise((resolve) => {
    const done = () => resolve(getViVoices().length > 0);
    const onVoices = () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
      done();
    };
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
      done();
    }, ms);
  });
}

function speakOnce(text, voice) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";
    u.rate = 0.86;
    u.pitch = 1;
    u.volume = 1;
    if (voice) u.voice = voice;

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(ok));
    };

    u.onend = () => finish(true);
    u.onerror = () => finish(false);

    try {
      window.speechSynthesis.speak(u);
    } catch {
      finish(false);
      return;
    }

    window.setTimeout(() => {
      if (!settled && window.speechSynthesis?.speaking) finish(true);
      else if (!settled) finish(false);
    }, 12000);
  });
}

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function speakVietnameseText(text) {
  const raw = String(text || "")
    .trim()
    .replace(/<\/?english>/gi, "");
  if (!raw || typeof window === "undefined" || !window.speechSynthesis) {
    return false;
  }

  const job = async () => {
    await waitForVoices();
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    await new Promise((r) => window.setTimeout(r, 150));

    const voice = pickViVoice();
    const chunks = raw.match(/[^.!?…]+[.!?…]?/g)?.map((s) => s.trim()).filter(Boolean) || [raw];
    let spoke = false;

    for (const chunk of chunks) {
      const ok = await speakOnce(chunk, voice);
      spoke = spoke || ok;
      if (chunks.length > 1) {
        await new Promise((r) => window.setTimeout(r, 200));
      }
    }

    return spoke;
  };

  viSpeakChain = viSpeakChain.then(job).catch(() => false);
  return viSpeakChain;
}

export function stopVietnameseSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  viSpeakChain = Promise.resolve();
}

/** Wait until browser TTS queue is idle (avoids EN canceling VI). */
export function waitForSpeechIdle(maxMs = 20000) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (!window.speechSynthesis.speaking) {
        resolve();
        return;
      }
      if (Date.now() - start >= maxMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

if (typeof window !== "undefined") {
  window.speechSynthesis?.getVoices?.();
  window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
}
