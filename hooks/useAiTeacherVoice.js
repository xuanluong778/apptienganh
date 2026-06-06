"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speakEnglishText, stopEnglishSpeech } from "@/lib/lessons/speak-english-client";
import { speakVietnameseText, stopVietnameseSpeech, waitForSpeechIdle } from "@/lib/lessons/speak-vietnamese-client";
import { primeSpeechEngines } from "@/lib/lessons/prime-speech";

function groupConsecutiveSegments(segments) {
  const groups = [];
  for (const seg of segments) {
    const lang = seg.lang === "vi" ? "vi" : "en";
    const last = groups[groups.length - 1];
    if (last && last.lang === lang) {
      last.texts.push(seg.text);
    } else {
      groups.push({ lang, texts: [seg.text] });
    }
  }
  return groups.map((g) => ({ lang: g.lang, text: g.texts.join(" ") }));
}

async function fetchTeacherSpeechSegment(lang, text) {
  try {
    const res = await fetch("/api/ai-call/teacher-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ segments: [{ lang, text }] }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.data?.audioBase64) return null;
    if (lang === "vi" && json.data.provider === "openai") return null;
    return json.data;
  } catch {
    return null;
  }
}

async function fetchVbeeSpeech(text) {
  try {
    const res = await fetch("/api/lessons/vbee-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.data?.audioBase64) return null;
    return json.data;
  } catch {
    return null;
  }
}

function playAudioElement(audio, { onAttach } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(Boolean(ok));
    };

    onAttach?.(audio);
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    timer = window.setTimeout(() => finish(false), 45000);
    audio.play().catch(() => finish(false));
  });
}

/**
 * AI teacher voice — tiếng Việt: trình duyệt trước (luôn nghe được sau bấm micro).
 */
export function useAiTeacherVoice({ enabled = true, onAudioElement, onSpeakingChange } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [provider, setProvider] = useState("");
  const audioRef = useRef(null);
  const lastPayloadRef = useRef(null);
  const chainRef = useRef(Promise.resolve());

  const setSpeaking = useCallback(
    (v) => {
      setIsSpeaking(v);
      onSpeakingChange?.(v);
    },
    [onSpeakingChange]
  );

  const stop = useCallback(() => {
    stopEnglishSpeech();
    stopVietnameseSpeech();
    try {
      audioRef.current?.pause?.();
    } catch {
      /* ignore */
    }
    audioRef.current = null;
    onAudioElement?.(null);
    setSpeaking(false);
    setSubtitle("");
  }, [onAudioElement, setSpeaking]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (enabled) return;
    stop();
  }, [enabled, stop]);

  const playServerAudio = useCallback(
    async (data, sub) => {
      if (!enabled || !data?.audioBase64) return false;

      stopEnglishSpeech();
      stopVietnameseSpeech();

      const audio = new Audio(`data:${data.contentType || "audio/mpeg"};base64,${data.audioBase64}`);
      audioRef.current = audio;
      setSubtitle(sub || "");
      setSpeaking(true);

      const ok = await playAudioElement(audio, { onAttach: onAudioElement });
      audioRef.current = null;
      onAudioElement?.(null);
      return ok;
    },
    [enabled, onAudioElement, setSpeaking]
  );

  const speakViSegment = useCallback(
    async (text) => {
      const t = String(text || "").trim();
      if (!t || !enabled) return false;

      primeSpeechEngines();
      setSubtitle(t);
      setSpeaking(true);

      // Azure/VBEE trước (giọng Việt tự nhiên) — hoạt động cả khi MySQL tắt (dev)
      const server = (await fetchTeacherSpeechSegment("vi", t)) || (await fetchVbeeSpeech(t));
      if (server?.audioBase64) {
        setProvider(server.provider || "azure");
        const ok = await playServerAudio(server, t);
        if (ok) return true;
      }

      setProvider("browser-vi");
      return speakVietnameseText(t);
    },
    [enabled, playServerAudio, setSpeaking]
  );

  const speakEnSegment = useCallback(
    async (text) => {
      const t = String(text || "").trim();
      if (!t || !enabled) return false;

      primeSpeechEngines();
      setSubtitle(t);
      setSpeaking(true);

      // Chờ Web Speech tiếng Việt (nếu vừa đọc xong) trước khi phát tiếng Anh
      await new Promise((r) => window.setTimeout(r, 300));

      const server = await fetchTeacherSpeechSegment("en", t);
      if (server) {
        setProvider(server.provider || "azure");
        const ok = await playServerAudio(server, t);
        if (ok) return true;
      }

      setProvider("browser-en");
      await speakEnglishText(t, 0.92);
      return true;
    },
    [enabled, playServerAudio, setSpeaking]
  );

  const speakSegmentsSequentially = useCallback(
    async (segments) => {
      if (!enabled) return;
      setSpeaking(true);
      setProvider("bilingual");

      const grouped = groupConsecutiveSegments(segments);
      for (const seg of grouped) {
        if (seg.lang === "vi") {
          await speakViSegment(seg.text);
          await waitForSpeechIdle();
        } else {
          await speakEnSegment(seg.text);
        }
      }

      setSpeaking(false);
      onAudioElement?.(null);
    },
    [enabled, onAudioElement, setSpeaking, speakEnSegment, speakViSegment]
  );

  const speak = useCallback(
    (segments, meta = {}) => {
      const cleaned = (segments || []).filter((s) => String(s.text || "").trim());
      if (!cleaned.length || !enabled) return Promise.resolve();

      lastPayloadRef.current = { segments: cleaned, meta };
      primeSpeechEngines();

      chainRef.current = chainRef.current.then(async () => {
        try {
          audioRef.current?.pause?.();
        } catch {
          /* ignore */
        }
        audioRef.current = null;
        stopEnglishSpeech();
        stopVietnameseSpeech();

        setSpeaking(true);
        setSubtitle(cleaned.map((s) => s.text).join(" · "));

        await speakSegmentsSequentially(cleaned);
        setSpeaking(false);
      });

      return chainRef.current;
    },
    [enabled, speakSegmentsSequentially, stop, setSpeaking]
  );

  const replayLast = useCallback(() => {
    primeSpeechEngines();
    const last = lastPayloadRef.current;
    if (!last?.segments?.length) return Promise.resolve();
    return speak(last.segments, last.meta);
  }, [speak]);

  return {
    speak,
    stop,
    replayLast,
    isSpeaking,
    subtitle,
    provider,
    audioRef,
    primeSpeechEngines,
  };
}
