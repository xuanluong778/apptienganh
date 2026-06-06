"use client";

import { useState } from "react";
import FilterBottomSheet from "@/components/vocabulary/FilterBottomSheet";
import TopicChipScroller from "@/components/vocabulary/TopicChipScroller";
import { posChipMeta } from "@/lib/vocabulary/mock-ui";

function PosChip({ active, onClick, pos }) {
  const meta = posChipMeta(pos);
  if (!meta && pos !== "") return null;
  const tone = pos === "" ? "all" : meta.tone;
  const label = pos === "" ? "Tất cả" : `${meta.short} ${meta.label}`;

  return (
    <button
      type="button"
      className={`beego-vocab-chip beego-vocab-chip--pos beego-vocab-chip--pos-${tone} ${
        active ? "beego-vocab-chip--active" : ""
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function VocabularyFilters({
  keyword,
  onKeywordChange,
  topics,
  onRefreshTopics,
  selectedTopic,
  onSelectedTopic,
  selectedPos,
  onSelectedPos,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const FiltersBody = (
    <div className="beego-vocab-filterBody">
      <div className="beego-vocab-searchBar">
        <span className="beego-vocab-searchIcon" aria-hidden>
          🔍
        </span>
        <input
          id="beego-vocab-search"
          type="search"
          className="beego-vocab-searchInput"
          placeholder="Tìm từ vựng bằng tiếng Anh hoặc tiếng Việt…"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className="beego-vocab-refreshBtn"
          onClick={onRefreshTopics}
          aria-label="Làm mới"
        >
          Làm mới
        </button>
      </div>

      <TopicChipScroller
        topics={topics}
        selectedTopic={selectedTopic}
        onSelectedTopic={onSelectedTopic}
      />

      <div className="beego-vocab-filterGroup beego-vocab-filterGroup--pos">
        <span className="beego-vocab-filterLabel beego-vocab-filterLabel--center">Từ loại</span>
        <div className="beego-vocab-chipRow beego-vocab-chipRow--center" role="group" aria-label="Từ loại">
          <PosChip active={selectedPos === ""} onClick={() => onSelectedPos("")} pos="" />
          <PosChip active={selectedPos === "noun"} onClick={() => onSelectedPos("noun")} pos="noun" />
          <PosChip active={selectedPos === "verb"} onClick={() => onSelectedPos("verb")} pos="verb" />
          <PosChip
            active={selectedPos === "adjective"}
            onClick={() => onSelectedPos("adjective")}
            pos="adjective"
          />
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label="Bộ lọc từ vựng" className="beego-vocab-filterCard">
      <div className="beego-vocab-filterDesktop">{FiltersBody}</div>

      <div className="beego-vocab-filterMobile">
        <div className="beego-vocab-searchBar beego-vocab-searchBar--mobile">
          <span className="beego-vocab-searchIcon" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            className="beego-vocab-searchInput"
            placeholder="Tìm từ vựng…"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            className="beego-vocab-filterSheetBtn"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở bộ lọc"
          >
            Bộ lọc
          </button>
        </div>
      </div>

      <FilterBottomSheet open={mobileOpen} onClose={() => setMobileOpen(false)} title="Bộ lọc từ vựng">
        {FiltersBody}
      </FilterBottomSheet>
    </section>
  );
}
