"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAllTopicChips } from "@/lib/vocabulary/mock-ui";

function TopicChip({ active, onClick, icon, title, dataTopic, children }) {
  return (
    <button
      type="button"
      className={`beego-vocab-chip beego-vocab-chip--topic ${active ? "beego-vocab-chip--active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      title={title}
      data-topic={dataTopic ?? ""}
    >
      {icon ? (
        <span className="beego-vocab-chipIcon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="beego-vocab-chipText">{children}</span>
    </button>
  );
}

export default function TopicChipScroller({ topics, selectedTopic, onSelectedTopic }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const topicChips = useMemo(() => buildAllTopicChips(topics), [topics]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(maxScroll > 8 && el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return undefined;

    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateArrows) : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro?.disconnect();
    };
  }, [topicChips, updateArrows]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedTopic) return;
    const active = el.querySelector(`[data-topic="${CSS.escape(selectedTopic)}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedTopic]);

  function scrollStep(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.floor(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className="beego-vocab-filterGroup beego-vocab-filterGroup--topics">
      <span className="beego-vocab-filterLabel beego-vocab-filterLabel--center">Chủ đề</span>
      <div className="beego-vocab-topicRail">
        <button
          type="button"
          className="beego-vocab-topicArrow"
          onClick={() => scrollStep(-1)}
          disabled={!canLeft}
          aria-label="Chủ đề trước"
        >
          ‹
        </button>

        <div ref={scrollRef} className="beego-vocab-chipScroll" role="group" aria-label="Chủ đề">
          <div className="beego-vocab-chipScrollInner">
            {topicChips.map((chip) => (
              <TopicChip
                key={chip.topic || "all"}
                dataTopic={chip.topic}
                icon={chip.icon}
                title={chip.title || chip.label}
                active={selectedTopic === chip.topic}
                onClick={() => onSelectedTopic(chip.topic)}
              >
                {chip.label}
              </TopicChip>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="beego-vocab-topicArrow"
          onClick={() => scrollStep(1)}
          disabled={!canRight}
          aria-label="Chủ đề sau"
        >
          ›
        </button>
      </div>
    </div>
  );
}
