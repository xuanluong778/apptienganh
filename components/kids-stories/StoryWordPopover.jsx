"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { playKidWordAudio, stopSpeaking } from "@/lib/kids-vocabulary/browser-tts";
import { normalizeStoryWord } from "@/lib/kids-stories/story-word-lookup";
import RecordPlaybackButtons from "@/components/kids-vocabulary/RecordPlaybackButtons";
import storyStyles from "./KidsStories.module.css";

export default function StoryWordPopover({
  anchor,
  rawToken,
  info,
  loading,
  onMouseEnter,
  onMouseLeave,
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!anchor) return;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      const width = Math.min(220, window.innerWidth - 16);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      let top = r.bottom + 2;
      const estH = 160;
      if (top + estH > window.innerHeight - 8) top = Math.max(8, r.top - estH - 8);
      setPos({ top, left, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor, info, loading]);

  if (!anchor || typeof document === "undefined") return null;

  const scoreWord = info?.word || normalizeStoryWord(rawToken);

  return createPortal(
    <div
      className={storyStyles.wordPopover}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="dialog"
      aria-label="Tra từ trong truyện"
    >
      {loading ? (
        <p className={storyStyles.wordPopoverLoading}>Đang tra từ…</p>
      ) : info ? (
        <>
          <div className={storyStyles.wordPopoverHead}>
            <p className={storyStyles.wordPopoverWord}>{info.word}</p>
            <button
              type="button"
              className={storyStyles.wordPopoverListen}
              onClick={() => {
                stopSpeaking();
                void playKidWordAudio({ word: info.word, audioUrl: info.audioUrl });
              }}
              aria-label="Nghe phát âm"
              title="Nghe"
            >
              🔊
            </button>
          </div>
          {info.phonetic ? <p className={storyStyles.wordPopoverPhonetic}>{info.phonetic}</p> : null}
          <p className={storyStyles.wordPopoverMeaning}>{info.meaning}</p>
          <div className={storyStyles.wordPopoverRec}>
            <RecordPlaybackButtons
              label="🎙 Ghi âm"
              resetKey={scoreWord}
              scoreTarget={scoreWord}
              compact
            />
          </div>
        </>
      ) : (
        <p className={storyStyles.wordPopoverLoading}>Không tìm thấy từ này trong từ điển.</p>
      )}
    </div>,
    document.body
  );
}
