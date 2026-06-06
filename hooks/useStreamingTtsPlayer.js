"use client";

import { useCallback, useMemo, useRef } from "react";

function resampleFloat32(input, inRate, outRate) {
  if (inRate === outRate || input.length === 0) return input;
  const ratio = inRate / outRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const f = pos - j;
    const a = input[j] ?? 0;
    const b = input[j + 1] ?? a;
    out[i] = a * (1 - f) + b * f;
  }
  return out;
}

/**
 * Schedule PCM s16le chunks on AudioContext (playback-optimized).
 * Keeps odd trailing byte between chunks to avoid misaligned samples (crackling/static).
 */
export function useStreamingTtsPlayer({ inputSampleRate = 24000 } = {}) {
  const ctxRef = useRef(null);
  const nextTimeRef = useRef(0);
  const sourcesRef = useRef(new Set());
  const gainRef = useRef(null);
  const firstChunkRef = useRef(true);
  const coalescePartsRef = useRef([]);
  const coalesceTimerRef = useRef(null);
  const pendingOddByteRef = useRef(null);
  const minAheadRef = useRef(0.12);
  const COALESCE_MS = 50;
  const COALESCE_MIN_BYTES = 4800;

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    let ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed") {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx({ latencyHint: "playback" });
      ctxRef.current = ctx;
      nextTimeRef.current = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(ctx.destination);
      gainRef.current = g;
      firstChunkRef.current = true;
      pendingOddByteRef.current = null;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }, []);

  const clearCoalesce = useCallback(() => {
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    coalescePartsRef.current = [];
  }, []);

  const scheduleAlignedPcm = useCallback(
    (u8, fromRate = inputSampleRate) => {
      const ctx = ensureCtx();
      if (!ctx || !u8?.byteLength) return;

      let bytes = u8;
      if (pendingOddByteRef.current !== null) {
        const merged = new Uint8Array(1 + bytes.length);
        merged[0] = pendingOddByteRef.current;
        merged.set(bytes, 1);
        bytes = merged;
        pendingOddByteRef.current = null;
      }

      const evenLen = bytes.length - (bytes.length % 2);
      if (bytes.length % 2 === 1) {
        pendingOddByteRef.current = bytes[bytes.length - 1];
      }
      if (evenLen < 2) return;

      const slice = bytes.subarray(0, evenLen);
      const outRate = ctx.sampleRate;
      const now = ctx.currentTime;
      const n = evenLen / 2;
      const view = new DataView(slice.buffer, slice.byteOffset, evenLen);
      const f32In = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const v = view.getInt16(i * 2, true) / 32768;
        f32In[i] = Math.max(-1, Math.min(1, v));
      }
      const f32 = resampleFloat32(f32In, fromRate, outRate);
      const buf = ctx.createBuffer(1, f32.length, outRate);
      buf.copyToChannel(f32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = gainRef.current;
      if (g) src.connect(g);
      const startPad = firstChunkRef.current ? minAheadRef.current : 0.006;
      const startAt = Math.max(nextTimeRef.current, now + startPad);
      src.start(startAt);
      nextTimeRef.current = startAt + buf.duration;
      sourcesRef.current.add(src);
      src.onended = () => {
        sourcesRef.current.delete(src);
      };
      firstChunkRef.current = false;
    },
    [ensureCtx, inputSampleRate]
  );

  const flushCoalesce = useCallback(() => {
    coalesceTimerRef.current = null;
    const parts = coalescePartsRef.current;
    if (!parts.length) return;
    coalescePartsRef.current = [];
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      merged.set(part, offset);
      offset += part.length;
    }
    scheduleAlignedPcm(merged);
  }, [scheduleAlignedPcm]);

  const interrupt = useCallback(() => {
    clearCoalesce();
    pendingOddByteRef.current = null;
    for (const src of sourcesRef.current) {
      try {
        src.stop(0);
      } catch (_e) {}
      try {
        src.disconnect();
      } catch (_e2) {}
    }
    sourcesRef.current.clear();
    const ctx = ctxRef.current;
    if (ctx) {
      nextTimeRef.current = ctx.currentTime;
    }
    firstChunkRef.current = true;
  }, [clearCoalesce]);

  const enqueuePcmS16le = useCallback(
    (u8) => {
      if (!u8?.byteLength) return;
      const chunk =
        u8 instanceof Uint8Array ? u8 : new Uint8Array(u8.buffer, u8.byteOffset, u8.byteLength);
      coalescePartsRef.current.push(chunk);
      const bytes = coalescePartsRef.current.reduce((sum, p) => sum + p.length, 0);
      if (bytes >= COALESCE_MIN_BYTES) {
        flushCoalesce();
        return;
      }
      if (!coalesceTimerRef.current) {
        coalesceTimerRef.current = setTimeout(flushCoalesce, COALESCE_MS);
      }
    },
    [flushCoalesce]
  );

  const setVolume = useCallback(
    (level) => {
      const g = gainRef.current;
      const ctx = ensureCtx();
      if (!g || !ctx) return;
      const v = Math.max(0, Math.min(1, Number(level) || 0));
      try {
        g.gain.setValueAtTime(v, ctx.currentTime);
      } catch (_e) {
        /* ignore */
      }
    },
    [ensureCtx]
  );

  const flushPending = useCallback(() => {
    flushCoalesce();
  }, [flushCoalesce]);

  const close = useCallback(() => {
    interrupt();
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
  }, [interrupt]);

  return useMemo(
    () => ({ enqueuePcmS16le, interrupt, flushPending, close, ensureCtx, setVolume }),
    [enqueuePcmS16le, interrupt, flushPending, close, ensureCtx, setVolume]
  );
}
