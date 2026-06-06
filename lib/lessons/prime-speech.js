/**
 * Prime Web Speech voices after user gesture (required on Chrome/Edge).
 */

let primed = false;

export function primeSpeechEngines() {
  if (primed || typeof window === "undefined" || !window.speechSynthesis) return;
  primed = true;

  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }

  const run = () => {
    try {
      const vi = new SpeechSynthesisUtterance(" ");
      vi.lang = "vi-VN";
      vi.volume = 0.01;
      vi.rate = 1;
      window.speechSynthesis.speak(vi);
      window.setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }, 40);
    } catch {
      /* ignore */
    }
  };

  const voices = window.speechSynthesis.getVoices?.() || [];
  if (voices.length) run();
  else {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
      run();
    };
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    window.setTimeout(run, 500);
  }
}

export function isSpeechPrimed() {
  return primed;
}
