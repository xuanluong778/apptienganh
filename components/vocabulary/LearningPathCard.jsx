"use client";

export default function LearningPathCard({
  stats = null,
  loading = false,
  onStartStudy,
  onStartReview,
  onStartPronunciation,
}) {
  const s = stats || {};
  const progress = Number(s.progress_percent || 0);

  return (
    <div className="beego-vocab-pathCard">
      <h2 className="beego-vocab-pathCard__title">Lộ trình học</h2>
      <p className="beego-vocab-pathCard__sub">Học từ mới, ôn SRS và luyện phát âm mỗi ngày.</p>

      <div className="beego-vocab-pathCard__metrics">
        <div className="beego-vocab-pathMetric">
          <span className="beego-vocab-pathMetric__icon" aria-hidden>
            ✨
          </span>
          <div>
            <span className="beego-vocab-pathMetric__label">Học từ mới hôm nay</span>
            <strong className="beego-vocab-pathMetric__value">
              {loading ? "…" : s.new_today ?? 0} từ
            </strong>
          </div>
        </div>
        <div className="beego-vocab-pathMetric">
          <span className="beego-vocab-pathMetric__icon" aria-hidden>
            🔄
          </span>
          <div>
            <span className="beego-vocab-pathMetric__label">Từ cần ôn</span>
            <strong className="beego-vocab-pathMetric__value">
              {loading ? "…" : s.review_due ?? 0} từ
            </strong>
          </div>
        </div>
        <div className="beego-vocab-pathMetric">
          <span className="beego-vocab-pathMetric__icon" aria-hidden>
            🎤
          </span>
          <div>
            <span className="beego-vocab-pathMetric__label">Luyện phát âm</span>
            <strong className="beego-vocab-pathMetric__value">
              {loading ? "…" : s.pronunciation_practiced ?? 0} lượt
            </strong>
          </div>
        </div>
      </div>

      <div className="beego-vocab-pathCard__progress">
        <div className="beego-vocab-pathCard__progressHead">
          <span>Tiến độ</span>
          <strong>{loading ? "…" : `${progress}%`}</strong>
        </div>
        <div className="beego-vocab-pathCard__progressBar">
          <div
            className="beego-vocab-pathCard__progressFill"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      <button type="button" className="beego-vocab-pathCard__cta" onClick={onStartStudy}>
        Bắt đầu học →
      </button>

      <div className="beego-vocab-pathCard__quick">
        <button type="button" className="beego-vocab-pathCard__quickBtn" onClick={onStartReview}>
          Ôn tập ngay
        </button>
        <button
          type="button"
          className="beego-vocab-pathCard__quickBtn"
          onClick={onStartPronunciation}
        >
          Luyện nói
        </button>
      </div>
    </div>
  );
}
