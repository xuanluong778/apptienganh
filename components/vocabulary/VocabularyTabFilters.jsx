"use client";

export const VOCAB_TABS = [
  { id: "all", label: "Tất cả từ" },
  { id: "learning", label: "Đang học" },
  { id: "review_today", label: "Cần ôn hôm nay" },
  { id: "saved", label: "Đã lưu" },
  { id: "difficult", label: "Từ khó" },
];

export default function VocabularyTabFilters({ activeTab = "all", onChange, disabled = false }) {
  return (
    <div className="beego-vocab-tabs" role="tablist" aria-label="Lọc từ vựng">
      {VOCAB_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`beego-vocab-tab${active ? " beego-vocab-tab--active" : ""}`}
            onClick={() => onChange?.(tab.id)}
            disabled={disabled}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
