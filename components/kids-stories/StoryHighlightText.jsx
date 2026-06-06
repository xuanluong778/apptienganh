"use client";

import { useEffect, useMemo, useRef } from "react";
import storyStyles from "./KidsStories.module.css";
import { buildStoryWords, viWordIndexForEnToken } from "@/lib/kids-stories/story-words";
import { normalizeStoryWord } from "@/lib/kids-stories/story-word-lookup";
import StoryWordPopover from "./StoryWordPopover";
import { useStoryWordPopover } from "./useStoryWordPopover";

/**
 * Đoạn văn liền — highlight từng từ (activeWordIdx = chỉ số từ trong lang).
 * @param {{ paragraphs: { en: string, vi: string }[], activeWordIdx: number, lang?: "en"|"vi", className?: string, mirrorLang?: "en"|"vi", vocabulary?: object[], interactive?: boolean, hoverTranslate?: boolean }} props
 */
export default function StoryHighlightText({
  paragraphs,
  activeWordIdx,
  lang = "en",
  className = "",
  mirrorLang = null,
  vocabulary = [],
  interactive = true,
  hoverTranslate = false,
}) {
  const wrapRef = useRef(null);
  const words = useMemo(() => buildStoryWords(paragraphs, lang), [paragraphs, lang]);
  const mirrorWords = useMemo(
    () => (mirrorLang ? buildStoryWords(paragraphs, mirrorLang) : null),
    [paragraphs, mirrorLang]
  );

  const enWordsForMirror = useMemo(() => buildStoryWords(paragraphs, "en"), [paragraphs]);
  const popover = useStoryWordPopover(vocabulary);
  const canLookup = interactive && hoverTranslate;

  useEffect(() => {
    if (!canLookup) popover.close();
  }, [canLookup, popover.close]);

  const tokenLookupable = (token) => {
    const n = normalizeStoryWord(token);
    return n.length >= 2 && /[a-z]/i.test(n);
  };

  const activeEnToken = useMemo(() => {
    if (activeWordIdx < 0) return null;
    if (lang === "en") return words[activeWordIdx] || null;
    if (mirrorLang === "en") return enWordsForMirror[activeWordIdx] || null;
    return null;
  }, [lang, mirrorLang, activeWordIdx, words, enWordsForMirror]);

  const mirrorActiveIdx = useMemo(() => {
    if (!mirrorWords || !activeEnToken) return -1;
    return viWordIndexForEnToken(mirrorWords, activeEnToken);
  }, [mirrorWords, activeEnToken]);

  const scrollWordIdx = useMemo(() => {
    if (activeWordIdx < 0) return -1;
    if (lang === "en") return activeWordIdx;
    if (lang === "vi" && mirrorLang === "en") return mirrorActiveIdx;
    return -1;
  }, [activeWordIdx, lang, mirrorLang, mirrorActiveIdx]);

  useEffect(() => {
    if (scrollWordIdx < 0 || !wrapRef.current) return;
    const el = wrapRef.current.querySelector(`[data-word="${scrollWordIdx}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [scrollWordIdx]);

  const bodyCls = [storyStyles.storyBody, className].filter(Boolean).join(" ");

  return (
    <>
      <p ref={wrapRef} className={bodyCls}>
        {words.map((w, i) => {
          let active = lang === "en" && activeWordIdx === i;
          if (lang === "vi" && mirrorLang === "en" && mirrorActiveIdx === i) {
            active = true;
          }
          const canWord = canLookup && tokenLookupable(w.text);
          const spanCls = [
            active ? storyStyles.storySpanActive : storyStyles.storySpan,
            canWord ? storyStyles.storySpanInteractive : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <span
              key={`${lang}-${i}`}
              data-word={i}
              className={spanCls}
              onMouseEnter={canWord ? (e) => popover.onSpanEnter(e.currentTarget, w.text) : undefined}
              onMouseLeave={canWord ? popover.onSpanLeave : undefined}
              onClick={
                canWord
                  ? (e) => {
                      e.preventDefault();
                      popover.onSpanClick(e.currentTarget, w.text);
                    }
                  : undefined
              }
            >
              {w.text}{" "}
            </span>
          );
        })}
      </p>
      {canLookup ? (
        <StoryWordPopover
          anchor={popover.anchor}
          rawToken={popover.rawToken}
          info={popover.info}
          loading={popover.loading}
          onMouseEnter={popover.onPopoverEnter}
          onMouseLeave={popover.onPopoverLeave}
        />
      ) : null}
    </>
  );
}
