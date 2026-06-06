"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { posChipMeta } from "@/lib/vocabulary/mock-ui";
import { resolveCardImage } from "@/lib/vocabulary/card-image";
import { isBookmarked, toggleBookmark } from "@/lib/vocabulary/bookmarks";

const ACCENT_TONES = ["blue", "pink", "green"];
const LEVEL_LABELS = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export default function VocabularyCard({
  item,
  index = 0,
  recordingId,
  speechResult,
  onListenWord,
  onListenSentence,
  onRecordWord,
  onRecordSentence,
  onEnqueueReview,
  reviewState = "idle",
}) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(item.id));
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const posMeta = posChipMeta(item.part_of_speech);
  const { src: imageSrc } = resolveCardImage(item);
  const accent = ACCENT_TONES[index % ACCENT_TONES.length];
  const recordingWord = recordingId === item.id;
  const recordingSentence = recordingId === `sentence-${item.id}`;
  const wordScore = speechResult?.[item.id];
  const sentenceScore = speechResult?.[`sentence-${item.id}`];
  const levelLabel = LEVEL_LABELS[String(item.level || "beginner").toLowerCase()] || "Cơ bản";

  const reviewLoading = reviewState === "loading";
  const reviewDone = reviewState === "success";
  const reviewAuth = reviewState === "auth";

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [imageSrc]);

  function handleBookmark(e) {
    e.stopPropagation();
    setBookmarked(toggleBookmark(item.id));
  }

  return (
    <article className={`beego-vocab-card beego-vocab-card--accent-${accent}`}>
      <div className="beego-vocab-cardMedia">
        {!imgLoaded && !imgError ? (
          <div className="beego-vocab-cardSkeleton" aria-hidden />
        ) : null}
        <img
          className={`beego-vocab-cardImg${imgLoaded ? " beego-vocab-cardImg--loaded" : ""}`}
          src={imgError ? resolveCardImage({ ...item, image_url: "", image_status: "" }).src : imageSrc}
          alt={item.word || ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true);
            setImgLoaded(true);
          }}
        />
        <div className="beego-vocab-cardBadges">
          <span className="beego-vocab-cardLevel">{levelLabel}</span>
          {posMeta ? (
            <span className={`beego-vocab-cardPos beego-vocab-cardPos--${posMeta.tone}`}>
              {posMeta.short}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={`beego-vocab-cardStar ${bookmarked ? "beego-vocab-cardStar--on" : ""}`}
          onClick={handleBookmark}
          aria-label={bookmarked ? "Bỏ lưu" : "Lưu từ"}
          aria-pressed={bookmarked}
        >
          {bookmarked ? "★" : "☆"}
        </button>
      </div>

      <div className="beego-vocab-cardBody">
        <h3 className="beego-vocab-cardWord">{item.word}</h3>
        <p className="beego-vocab-cardIpa">{item.ipa || `/${String(item.word || "").toLowerCase()}/`}</p>
        {posMeta ? (
          <span className={`beego-vocab-cardPosTag beego-vocab-cardPos--${posMeta.tone}`}>
            {posMeta.label}
          </span>
        ) : null}

        <p className="beego-vocab-cardMeaning">{item.vietnamese_meaning || "—"}</p>

        {item.example_sentence ? (
          <div className="beego-vocab-cardExampleBox">
            <p className="beego-vocab-cardExampleEn">{item.example_sentence}</p>
            {item.example_sentence_vi ? (
              <p className="beego-vocab-cardExampleVi">{item.example_sentence_vi}</p>
            ) : null}
          </div>
        ) : null}

        {wordScore ? (
          <p className="beego-vocab-cardScore">Từ: {wordScore.score}% — {wordScore.message}</p>
        ) : null}
        {sentenceScore ? (
          <p className="beego-vocab-cardScore">Câu: {sentenceScore.score}% — {sentenceScore.message}</p>
        ) : null}

        <div className="beego-vocab-cardActions beego-vocab-cardActions--grid">
          <button type="button" className="beego-vocab-btn beego-vocab-btn--solid" onClick={() => onListenWord(item)}>
            <span aria-hidden>🔊</span> Nghe từ
          </button>
          <button
            type="button"
            className="beego-vocab-btn beego-vocab-btn--solid"
            onClick={() => onListenSentence(item)}
          >
            <span aria-hidden>🔊</span> Nghe câu
          </button>
          <button
            type="button"
            className={`beego-vocab-btn beego-vocab-btn--mic ${recordingWord ? "beego-vocab-micBtn--active" : ""}`}
            onClick={() => onRecordWord(item)}
            disabled={recordingId && !recordingWord}
          >
            <span aria-hidden>🎤</span> {recordingWord ? "Đang ghi…" : "Luyện nói"}
          </button>
          <button
            type="button"
            className={`beego-vocab-btn beego-vocab-btn--outline ${bookmarked ? "beego-vocab-btn--saved" : ""}`}
            onClick={handleBookmark}
          >
            {bookmarked ? "★ Đã lưu" : "☆ Lưu từ"}
          </button>
        </div>

        {reviewAuth ? (
          <Link href="/auth?next=%2Fvocabulary" className="beego-vocab-btn beego-vocab-btn--auth">
            Đăng nhập để thêm vào ôn tập
          </Link>
        ) : (
          <button
            type="button"
            className="beego-vocab-btn beego-vocab-btn--outline beego-vocab-btn--review"
            onClick={() => onEnqueueReview?.(item)}
            disabled={reviewLoading || reviewDone}
          >
            {reviewLoading
              ? "Đang thêm…"
              : reviewDone
              ? "✓ Đã thêm vào ôn tập"
              : "+ Thêm vào ôn tập"}
          </button>
        )}
      </div>
    </article>
  );
}
