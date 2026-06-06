"use client";

import { useEffect, useMemo, useState } from "react";
import { groupTopicsForPicker } from "@/lib/vocabulary/topic-groups";

export default function TopicPickerModal({
  open = false,
  topics = [],
  selectedTopic = "",
  onClose,
  onSelect,
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const { popular, goals, all } = useMemo(() => groupTopicsForPicker(topics), [topics]);

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((t) => t.topic.toLowerCase().includes(q));
  }, [all, search]);

  if (!open) return null;

  function pick(topic) {
    onSelect?.(topic);
    onClose?.();
  }

  const TopicBtn = ({ topic, label, icon, count }) => {
    const active = selectedTopic === topic;
    return (
      <button
        type="button"
        className={`beego-vocab-topicBtn${active ? " beego-vocab-topicBtn--active" : ""}`}
        onClick={() => pick(topic)}
      >
        <span className="beego-vocab-topicBtn__icon" aria-hidden>
          {icon || "🏷️"}
        </span>
        <span className="beego-vocab-topicBtn__text">
          <span className="beego-vocab-topicBtn__label">{label || topic}</span>
          {count != null ? <span className="beego-vocab-topicBtn__count">{count} từ</span> : null}
        </span>
      </button>
    );
  };

  return (
    <div className="beego-vocab-topicOverlay" role="presentation" onClick={onClose}>
      <div
        className="beego-vocab-topicSheet"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn chủ đề"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="beego-vocab-topicSheet__handle" aria-hidden />
        <header className="beego-vocab-topicSheet__head">
          <h2>Chọn chủ đề</h2>
          <button type="button" className="beego-vocab-topicSheet__close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="beego-vocab-topicSheet__searchWrap">
          <input
            type="search"
            className="beego-vocab-topicSheet__search"
            placeholder="Tìm chủ đề…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="beego-vocab-topicSheet__body">
          {!search ? (
            <>
              <section className="beego-vocab-topicSection">
                <h3>Phổ biến</h3>
                <div className="beego-vocab-topicGrid">
                  <TopicBtn topic="" label="Tất cả chủ đề" icon="📚" />
                  {popular.map((t) => (
                    <TopicBtn
                      key={t.topic}
                      topic={t.topic}
                      label={t.label}
                      icon={t.icon}
                      count={t.total}
                    />
                  ))}
                </div>
              </section>

              {goals.map((group) => (
                <section key={group.id} className="beego-vocab-topicSection">
                  <h3>
                    {group.icon} {group.label}
                  </h3>
                  <div className="beego-vocab-topicGrid">
                    {group.topics.map((t) => (
                      <TopicBtn
                        key={t.topic}
                        topic={t.topic}
                        label={t.topic}
                        icon={t.icon}
                        count={t.total}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : null}

          <section className="beego-vocab-topicSection">
            <h3>{search ? "Kết quả tìm kiếm" : "Tất cả chủ đề"}</h3>
            <div className="beego-vocab-topicList">
              {!search ? (
                <TopicBtn topic="" label="Tất cả chủ đề" icon="📚" count={null} />
              ) : null}
              {filteredAll.map((t) => (
                <TopicBtn
                  key={t.topic}
                  topic={t.topic}
                  label={t.topic}
                  icon={t.icon}
                  count={t.total}
                />
              ))}
              {filteredAll.length === 0 ? (
                <p className="beego-vocab-topicEmpty">Không tìm thấy chủ đề phù hợp.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
