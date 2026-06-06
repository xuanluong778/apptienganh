"use client";

import { useMemo, useRef } from "react";
import storyStyles from "./KidsStories.module.css";
import StoryWordPopover from "./StoryWordPopover";
import { normalizeStoryWord } from "@/lib/kids-stories/story-word-lookup";
import { useStoryWordPopover } from "./useStoryWordPopover";

function isLookupToken(part) {
  const n = normalizeStoryWord(part);
  return n.length >= 2 && /[a-z]/i.test(n);
}

/** Đoạn storyTabText — mỗi từ có hover tra nghĩa + ghi âm. */
export default function StoryTabInteractiveText({ text, className = "", vocabulary = [] }) {
  const wrapRef = useRef(null);
  const tokens = useMemo(
    () =>
      String(text || "")
        .split(/(\s+)/)
        .filter((t) => t.length > 0),
    [text]
  );

  const popover = useStoryWordPopover(vocabulary);
  const bodyCls = [storyStyles.storyBody, className].filter(Boolean).join(" ");

  return (
    <>
      <p ref={wrapRef} className={bodyCls}>
        {tokens.map((part, i) => {
          if (/^\s+$/.test(part)) return <span key={`sp-${i}`}>{part}</span>;
          const lookup = isLookupToken(part);
          return (
            <span
              key={`w-${i}`}
              className={`${storyStyles.storySpan} ${lookup ? storyStyles.storySpanInteractive : ""}`}
              onMouseEnter={lookup ? (e) => popover.onSpanEnter(e.currentTarget, part) : undefined}
              onMouseLeave={lookup ? popover.onSpanLeave : undefined}
              onClick={
                lookup
                  ? (e) => {
                      e.preventDefault();
                      popover.onSpanClick(e.currentTarget, part);
                    }
                  : undefined
              }
            >
              {part}
            </span>
          );
        })}
      </p>
      <StoryWordPopover
        anchor={popover.anchor}
        rawToken={popover.rawToken}
        info={popover.info}
        loading={popover.loading}
        onMouseEnter={popover.onPopoverEnter}
        onMouseLeave={popover.onPopoverLeave}
      />
    </>
  );
}
