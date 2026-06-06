"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildVocabMap, resolveStoryWord } from "@/lib/kids-stories/story-word-lookup";

export function useStoryWordPopover(vocabulary = []) {
  const vocabMap = useMemo(() => buildVocabMap(vocabulary), [vocabulary]);
  const [anchor, setAnchor] = useState(null);
  const [rawToken, setRawToken] = useState("");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const pinnedRef = useRef(false);
  const hoverTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const overPopoverRef = useRef(false);
  const requestIdRef = useRef(0);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearHoverTimer();
    cancelHide();
    overPopoverRef.current = false;
    pinnedRef.current = false;
    setAnchor(null);
    setRawToken("");
    setInfo(null);
    setLoading(false);
  }, [clearHoverTimer, cancelHide]);

  const scheduleHide = useCallback(() => {
    if (pinnedRef.current) return;
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      if (pinnedRef.current || overPopoverRef.current) return;
      close();
    }, 220);
  }, [cancelHide, close]);

  const openFor = useCallback(
    async (el, token, { pin = false } = {}) => {
      if (!el || !token) return;
      clearHoverTimer();
      const reqId = ++requestIdRef.current;
      setAnchor(el);
      setRawToken(token);
      setLoading(true);
      setInfo(null);
      if (pin) pinnedRef.current = true;

      const data = await resolveStoryWord(token, vocabMap);
      if (requestIdRef.current !== reqId) return;
      setInfo(data);
      setLoading(false);
      if (!data && !pin) {
        pinnedRef.current = false;
        setAnchor(null);
        setRawToken("");
      }
    },
    [vocabMap, clearHoverTimer]
  );

  const onSpanEnter = useCallback(
    (el, token) => {
      if (pinnedRef.current) return;
      cancelHide();
      clearHoverTimer();
      hoverTimerRef.current = setTimeout(() => {
        void openFor(el, token);
      }, 160);
    },
    [openFor, clearHoverTimer, cancelHide]
  );

  const onSpanLeave = useCallback(() => {
    if (pinnedRef.current) return;
    clearHoverTimer();
    scheduleHide();
  }, [clearHoverTimer, scheduleHide]);

  const onSpanClick = useCallback(
    (el, token) => {
      clearHoverTimer();
      if (pinnedRef.current && anchor === el) {
        close();
        return;
      }
      void openFor(el, token, { pin: true });
    },
    [anchor, openFor, clearHoverTimer, close]
  );

  const onPopoverEnter = useCallback(() => {
    overPopoverRef.current = true;
    cancelHide();
    clearHoverTimer();
  }, [clearHoverTimer, cancelHide]);

  const onPopoverLeave = useCallback(() => {
    overPopoverRef.current = false;
    if (pinnedRef.current) return;
    scheduleHide();
  }, [scheduleHide]);

  useEffect(
    () => () => {
      clearHoverTimer();
      cancelHide();
    },
    [clearHoverTimer, cancelHide]
  );

  return {
    anchor,
    rawToken,
    info,
    loading,
    onSpanEnter,
    onSpanLeave,
    onSpanClick,
    onPopoverEnter,
    onPopoverLeave,
    close,
  };
}
