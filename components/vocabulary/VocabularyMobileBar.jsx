"use client";

export default function VocabularyMobileBar({ onTopics, onReview, onProgress }) {
  return (
    <nav className="beego-vocab-mobileBar" aria-label="Điều hướng từ vựng">
      <button type="button" className="beego-vocab-mobileBar__btn" onClick={onTopics}>
        <span aria-hidden>🏷️</span>
        <span>Chủ đề</span>
      </button>
      <button type="button" className="beego-vocab-mobileBar__btn" onClick={onReview}>
        <span aria-hidden>🔄</span>
        <span>Ôn tập</span>
      </button>
      <button type="button" className="beego-vocab-mobileBar__btn" onClick={onProgress}>
        <span aria-hidden>📈</span>
        <span>Tiến độ</span>
      </button>
    </nav>
  );
}
