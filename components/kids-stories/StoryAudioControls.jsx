"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearSpeechQueue,
  getStoryWordPlan,
  isSpeechActive,
  speakEnglishStoryByWords,
  stopSpeaking,
} from "@/lib/kids-vocabulary/browser-tts";
import storyStyles from "./KidsStories.module.css";

const READ_RATE = 0.85;

export default function StoryAudioControls({
  lines,
  activeWordIdx,
  onActiveWordIdx,
  onReadingChange,
  pauseMs = 350,
}) {
  const plan = useMemo(() => getStoryWordPlan(lines), [lines]);
  const totalWords = plan.totalWords;
  const playingRef = useRef(false);
  const playSessionRef = useRef(0);
  const positionRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [seekUi, setSeekUi] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const displayIdx = isSeeking
    ? seekUi
    : activeWordIdx >= 0
      ? activeWordIdx
      : progressIdx >= 0
        ? progressIdx
        : positionRef.current;
  const progressPct = totalWords > 1 ? Math.round((displayIdx / (totalWords - 1)) * 100) : 0;

  const setPlaying = useCallback(
    (value) => {
      playingRef.current = value;
      setIsPlaying(value);
      onReadingChange?.(value);
    },
    [onReadingChange]
  );

  const isPlaybackActive = useCallback(() => {
    return playingRef.current || isPlaying || isSpeechActive();
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    playSessionRef.current += 1;
    setPlaying(false);
    stopSpeaking();
    setProgressIdx(-1);
    onActiveWordIdx?.(-1);
  }, [setPlaying, onActiveWordIdx]);

  const playFrom = useCallback(
    async (wordIndex) => {
      if (!totalWords) return;
      const session = playSessionRef.current + 1;
      playSessionRef.current = session;

      const start = Math.max(0, Math.min(wordIndex, totalWords - 1));

      if (isSpeechActive() || playingRef.current) {
        stopSpeaking();
      } else {
        clearSpeechQueue();
      }

      setPlaying(true);
      positionRef.current = start;
      setProgressIdx(start);
      onActiveWordIdx?.(start);

      const result = await speakEnglishStoryByWords(lines, {
        rate: READ_RATE,
        pauseMs,
        startWordIndex: start,
        onWordGlobal: (idx) => {
          if (playSessionRef.current !== session) return;
          if (idx < 0) return;
          positionRef.current = idx;
          setProgressIdx(idx);
          onActiveWordIdx?.(idx);
        },
      });

      if (playSessionRef.current !== session) return;

      setPlaying(false);

      if (result?.cancelled) return;
      if (result?.ok) onActiveWordIdx?.(-1);
    },
    [lines, totalWords, pauseMs, onActiveWordIdx, setPlaying]
  );

  const togglePlay = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (isPlaybackActive()) {
        positionRef.current = activeWordIdx >= 0 ? activeWordIdx : positionRef.current;
        stopPlayback();
        return;
      }

      const start = activeWordIdx >= 0 ? activeWordIdx : positionRef.current;
      void playFrom(start);
    },
    [activeWordIdx, isPlaybackActive, playFrom, stopPlayback]
  );

  const onSeekInput = (value) => {
    const idx = Math.max(0, Math.min(Number(value) || 0, Math.max(0, totalWords - 1)));
    setSeekUi(idx);
    onActiveWordIdx?.(idx);
  };

  const commitSeek = () => {
    positionRef.current = seekUi;
    setIsSeeking(false);
    if (isPlaybackActive()) {
      stopPlayback();
      void playFrom(seekUi);
    }
  };

  useEffect(() => {
    if (!isPlaying) return undefined;
    const sync = setInterval(() => {
      if (isPlaying && !isSpeechActive()) {
        playingRef.current = false;
        setIsPlaying(false);
        onReadingChange?.(false);
        onActiveWordIdx?.(-1);
      }
    }, 250);
    return () => clearInterval(sync);
  }, [isPlaying, onReadingChange, onActiveWordIdx]);

  useEffect(() => {
    return () => {
      playSessionRef.current += 1;
      playingRef.current = false;
      stopSpeaking();
    };
  }, []);

  const showPause = isPlaying || playingRef.current || isSpeechActive();

  if (!totalWords) return null;

  return (
    <div className={storyStyles.storyPlayer}>
      <div className={storyStyles.progressRow}>
        <span className={storyStyles.progressTime}>
          Từ {Math.min(displayIdx + 1, totalWords)} / {totalWords}
        </span>
        <span className={storyStyles.progressPct}>{progressPct}%</span>
      </div>
      <div className={storyStyles.progressTrackRow}>
        <button
          type="button"
          className={storyStyles.playMiniBtn}
          onClick={togglePlay}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              togglePlay(e);
            }
          }}
          aria-pressed={showPause}
          aria-label={showPause ? "Dừng đọc truyện" : "Đọc truyện"}
          title={showPause ? "Dừng" : "Đọc truyện"}
        >
          {showPause ? (
            <span className={storyStyles.pauseIcon} aria-hidden />
          ) : (
            <span className={storyStyles.playTriangleIcon} aria-hidden />
          )}
        </button>
        <input
          type="range"
          className={storyStyles.progressRange}
          min={0}
          max={Math.max(0, totalWords - 1)}
          value={Math.max(0, displayIdx)}
          disabled={!totalWords}
          aria-label="Tiến trình đọc truyện"
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsSeeking(true);
            setSeekUi(activeWordIdx >= 0 ? activeWordIdx : positionRef.current);
          }}
          onChange={(e) => onSeekInput(e.target.value)}
          onPointerUp={commitSeek}
          onKeyUp={(e) => {
            if (e.key === "Enter") commitSeek();
          }}
        />
      </div>
    </div>
  );
}
