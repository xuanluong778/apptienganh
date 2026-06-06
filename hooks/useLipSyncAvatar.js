"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lip-sync + idle animations for AI teacher avatar.
 * @param {{ audioEl?: HTMLAudioElement|null, isSpeaking?: boolean, teacherStatus?: string, animated?: boolean }} params
 */
export function useLipSyncAvatar({ audioEl = null, isSpeaking = false, teacherStatus = "idle", animated = true }) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [nodding, setNodding] = useState(false);
  const [pointing, setPointing] = useState(false);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const prevStatusRef = useRef(teacherStatus);

  useEffect(() => {
    if (!animated) {
      setMouthOpen(0);
      return undefined;
    }

    if (!audioEl || !isSpeaking) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          /* ignore */
        }
        sourceRef.current = null;
      }
      if (!isSpeaking) setMouthOpen(0);
      return undefined;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;

    let ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new Ctx();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    try {
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioEl);
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
    } catch {
      /* already connected */
    }

    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser?.frequencyBinCount || 256);

    const tick = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      const avg = sum / data.length / 255;
      setMouthOpen(Math.min(1, avg * 2.2 + 0.08));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animated, audioEl, isSpeaking]);

  useEffect(() => {
    if (!animated || !isSpeaking || audioEl) return undefined;
    const id = window.setInterval(() => {
      setMouthOpen(0.18 + Math.random() * 0.65);
    }, 110);
    return () => clearInterval(id);
  }, [animated, audioEl, isSpeaking]);

  useEffect(() => {
    if (!animated) return undefined;
    const blinkLoop = () => {
      setBlinking(true);
      window.setTimeout(() => setBlinking(false), 140);
    };
    blinkLoop();
    const id = window.setInterval(blinkLoop, 3200 + Math.random() * 2000);
    return () => clearInterval(id);
  }, [animated]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = teacherStatus;

    if (!animated) return;

    if (
      (teacherStatus === "speaking" || teacherStatus === "correcting" || teacherStatus === "encouraging") &&
      prev !== teacherStatus
    ) {
      setNodding(true);
      const t = window.setTimeout(() => setNodding(false), 650);
      return () => clearTimeout(t);
    }

    if (teacherStatus === "correcting") {
      setPointing(true);
      const t = window.setTimeout(() => setPointing(false), 2800);
      return () => clearTimeout(t);
    }

    setPointing(false);
    return undefined;
  }, [animated, teacherStatus]);

  const expression =
    teacherStatus === "correcting"
      ? "correcting"
      : teacherStatus === "encouraging"
      ? "encouraging"
      : teacherStatus === "listening"
      ? "listening"
      : teacherStatus === "thinking"
      ? "thinking"
      : teacherStatus === "speaking"
      ? "speaking"
      : "idle";

  return {
    mouthOpen: animated ? mouthOpen : 0,
    blinking: animated && blinking,
    nodding: animated && nodding,
    pointing: animated && pointing,
    expression,
  };
}
