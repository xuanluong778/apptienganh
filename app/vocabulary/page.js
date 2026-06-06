"use client";

import { useCallback, useEffect, useState } from "react";
import VocabularyGrid from "@/components/vocabulary/VocabularyGrid";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import VocabularyStatsBar from "@/components/vocabulary/VocabularyStatsBar";
import VocabularyPager from "@/components/vocabulary/VocabularyPager";
import VocabularyTabFilters from "@/components/vocabulary/VocabularyTabFilters";
import LearningPathCard from "@/components/vocabulary/LearningPathCard";
import VocabularyProgressPanel from "@/components/vocabulary/VocabularyProgressPanel";
import TopicPickerModal from "@/components/vocabulary/TopicPickerModal";
import VocabularyMobileBar from "@/components/vocabulary/VocabularyMobileBar";
import VocabularyToast from "@/components/vocabulary/VocabularyToast";
import { useVocabularySpeech } from "@/components/vocabulary/useVocabularySpeech";
import { getBookmarkIds } from "@/lib/vocabulary/bookmarks";
import { posChipMeta } from "@/lib/vocabulary/mock-ui";
import "./vocabulary.css";

const PAGE_SIZE = 9;
const DEFAULT_LEVEL = "beginner";

function readUrlState() {
  if (typeof window === "undefined") {
    return { keyword: "", topic: "", tab: "all", pos: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    keyword: String(params.get("q") || "").trim(),
    topic: String(params.get("topic") || "").trim(),
    tab: String(params.get("tab") || "all").trim() || "all",
    pos: String(params.get("pos") || "").trim(),
  };
}

function writeUrlState({ keyword, topic, tab, pos }) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (topic) params.set("topic", topic);
  if (tab && tab !== "all") params.set("tab", tab);
  if (pos) params.set("pos", pos);
  const qs = params.toString();
  const next = qs ? `/vocabulary?${qs}` : "/vocabulary";
  window.history.replaceState(null, "", next);
}

export default function VocabularyPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPos, setSelectedPos] = useState("");
  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [reviewStates, setReviewStates] = useState({});

  const { recordingId, speechResult, startRecord } = useVocabularySpeech();

  useEffect(() => {
    const state = readUrlState();
    setKeyword(state.keyword);
    setSelectedTopic(state.topic);
    setActiveTab(state.tab);
    setSelectedPos(state.pos);
    const onPop = () => {
      const s = readUrlState();
      setKeyword(s.keyword);
      setSelectedTopic(s.topic);
      setActiveTab(s.tab);
      setSelectedPos(s.pos);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const syncUrl = useCallback((patch) => {
    writeUrlState({
      keyword: patch.keyword ?? keyword,
      topic: patch.topic ?? selectedTopic,
      tab: patch.tab ?? activeTab,
      pos: patch.pos ?? selectedPos,
    });
  }, [keyword, selectedTopic, activeTab, selectedPos]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/vocabulary/stats", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data || null);
    } catch {
      setStats(null);
    }
    setStatsLoading(false);
  }, []);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/vocabulary/topics?level=${encodeURIComponent(DEFAULT_LEVEL)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok && json.success) setTopics(json.data || []);
      else setTopics([]);
    } catch {
      setTopics([]);
    }
  }, []);

  useEffect(() => {
    void loadTopics();
    void loadStats();
  }, [loadTopics, loadStats]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");
      setAuthRequired(false);
      const levelQuery = `&level=${encodeURIComponent(DEFAULT_LEVEL)}`;
      const topicQuery = selectedTopic ? `&topic=${encodeURIComponent(selectedTopic)}` : "";
      const posQuery = selectedPos ? `&pos=${encodeURIComponent(selectedPos)}` : "";
      const keywordQuery = keyword ? `&q=${encodeURIComponent(keyword)}` : "";
      const tabQuery = activeTab !== "all" ? `&study_filter=${encodeURIComponent(activeTab)}` : "";
      const bookmarkQuery =
        activeTab === "saved"
          ? `&bookmark_ids=${encodeURIComponent(getBookmarkIds().join(","))}`
          : "";
      try {
        const res = await fetch(
          `/api/vocabulary?page=${page}&limit=${PAGE_SIZE}${levelQuery}${topicQuery}${posQuery}${keywordQuery}${tabQuery}${bookmarkQuery}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setItems(json.data || []);
          setTotal(Number(json.pagination?.total || 0));
          setAuthRequired(Boolean(json.auth_required));
        } else {
          setItems([]);
          setTotal(0);
          setLoadError("Không tải được danh sách từ vựng. Vui lòng thử lại.");
        }
      } catch {
        setItems([]);
        setTotal(0);
        setLoadError("Lỗi kết nối đến máy chủ. Vui lòng tải lại trang.");
      }
      setLoading(false);
    }
    load();
  }, [page, selectedTopic, selectedPos, keyword, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [keyword, selectedTopic, selectedPos, activeTab]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function listenWord(item) {
    const audio = new Audio(item.audio_url);
    audio.play().catch(() => {
      const utterance = new SpeechSynthesisUtterance(item.word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  function listenSentence(item) {
    const sentenceAudio = item.example_audio_url || "";
    if (sentenceAudio) {
      const audio = new Audio(sentenceAudio);
      audio.play().catch(() => {
        const utterance = new SpeechSynthesisUtterance(item.example_sentence || "");
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    } else {
      const utterance = new SpeechSynthesisUtterance(item.example_sentence || "");
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleEnqueueReview(item) {
    const id = item.id;
    setReviewStates((s) => ({ ...s, [id]: "loading" }));
    try {
      const res = await fetch("/api/review/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ word_id: id }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setReviewStates((s) => ({ ...s, [id]: "auth" }));
        return;
      }
      if (!res.ok || !json.success) {
        setReviewStates((s) => ({ ...s, [id]: "idle" }));
        setToast({ message: json.message || "Không thêm được vào ôn tập.", type: "error" });
        return;
      }
      setReviewStates((s) => ({ ...s, [id]: "success" }));
      setToast({ message: "Đã thêm vào ôn tập.", type: "success" });
      void loadStats();
    } catch {
      setReviewStates((s) => ({ ...s, [id]: "idle" }));
      setToast({ message: "Lỗi kết nối. Thử lại sau.", type: "error" });
    }
  }

  function handleKeywordChange(value) {
    setKeyword(value);
    syncUrl({ keyword: value });
  }

  function handleTopicSelect(topic) {
    setSelectedTopic(topic);
    syncUrl({ topic });
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    syncUrl({ tab });
  }

  function handlePosChange(pos) {
    setSelectedPos(pos);
    syncUrl({ pos });
  }

  const topicLabel = selectedTopic || "Tất cả chủ đề";
  const posOptions = ["", "noun", "verb", "adjective", "adverb"];

  return (
    <main className="beego-vocab-page">
      <VocabularyToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      <div className="beego-vocab-inner">
        <header className="beego-vocab-topHeader">
          <div>
            <h1>Từ vựng</h1>
            <p className="beego-vocab-sub">Flashcard • Nghe mẫu • Ôn tập thông minh</p>
          </div>
        </header>

        <div className="beego-vocab-searchRow beego-vocab-searchRow--mobile">
          <input
            type="search"
            className="beego-vocab-searchInput beego-vocab-searchInput--large"
            placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
          />
        </div>

        <div className="beego-vocab-layout">
          <aside className="beego-vocab-col beego-vocab-col--left">
            <LearningPathCard
              stats={stats}
              loading={statsLoading}
              onStartStudy={() => handleTabChange("learning")}
              onStartReview={() => handleTabChange("review_today")}
              onStartPronunciation={() => {
                const first = items[0];
                if (first) startRecord(first, { sentence: false });
              }}
            />
          </aside>

          <section className="beego-vocab-col beego-vocab-col--center">
            <div className="beego-vocab-stickyBar">
              <div className="beego-vocab-searchRow beego-vocab-searchRow--desktop">
                <input
                  type="search"
                  className="beego-vocab-searchInput"
                  placeholder="Tìm từ…"
                  value={keyword}
                  onChange={(e) => handleKeywordChange(e.target.value)}
                />
              </div>

              <VocabularyTabFilters activeTab={activeTab} onChange={handleTabChange} disabled={loading} />

              <div className="beego-vocab-toolbar">
                <button
                  type="button"
                  className="beego-vocab-topicTrigger"
                  onClick={() => setTopicModalOpen(true)}
                >
                  <span aria-hidden>🏷️</span>
                  <span className="beego-vocab-topicTrigger__label">{topicLabel}</span>
                  <span className="beego-vocab-topicTrigger__caret" aria-hidden>
                    ▾
                  </span>
                </button>

                <div className="beego-vocab-posRow" role="group" aria-label="Loại từ">
                  {posOptions.map((pos) => {
                    const meta = pos === "" ? null : posChipMeta(pos);
                    const active = selectedPos === pos;
                    return (
                      <button
                        key={pos || "all"}
                        type="button"
                        className={`beego-vocab-posChip${active ? " beego-vocab-posChip--active" : ""}`}
                        onClick={() => handlePosChange(pos)}
                      >
                        {pos === "" ? "Tất cả loại" : meta?.label || pos}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {authRequired ? (
              <p className="beego-vocab-authHint">
                <a href="/auth?next=%2Fvocabulary">Đăng nhập</a> để xem danh sách này.
              </p>
            ) : null}

            {loading ? <p className="beego-vocab-msg">Đang tải dữ liệu…</p> : null}
            {!loading && loadError ? <p className="beego-vocab-error">{loadError}</p> : null}

            <VocabularyGrid
              items={items}
              renderItem={(item, index) => (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  index={index}
                  recordingId={recordingId}
                  speechResult={speechResult}
                  onListenWord={listenWord}
                  onListenSentence={listenSentence}
                  onRecordWord={(row) => startRecord(row, { sentence: false })}
                  onRecordSentence={(row) => startRecord(row, { sentence: true })}
                  onEnqueueReview={handleEnqueueReview}
                  reviewState={reviewStates[item.id] || "idle"}
                />
              )}
            />

            {!loading && !items.length && !loadError ? (
              <p className="beego-vocab-msg">
                {activeTab === "saved"
                  ? "Chưa có từ nào được lưu — bấm ☆ trên thẻ từ."
                  : "Không có từ vựng phù hợp bộ lọc hiện tại."}
              </p>
            ) : null}

            <VocabularyPager
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </section>

          <aside className="beego-vocab-col beego-vocab-col--right">
            <VocabularyStatsBar />
            <VocabularyProgressPanel stats={stats} loading={statsLoading} />
          </aside>
        </div>
      </div>

      <VocabularyMobileBar
        onTopics={() => setTopicModalOpen(true)}
        onReview={() => handleTabChange("review_today")}
        onProgress={() => {
          document.querySelector(".beego-vocab-col--right")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <TopicPickerModal
        open={topicModalOpen}
        topics={topics}
        selectedTopic={selectedTopic}
        onClose={() => setTopicModalOpen(false)}
        onSelect={handleTopicSelect}
      />
    </main>
  );
}
