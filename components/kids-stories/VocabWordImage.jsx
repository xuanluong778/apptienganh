"use client";

import { useState } from "react";
import {
  kidWordImageUrl,
  kidWordOpenmojiImageUrl,
  kidWordTwemojiImageUrl,
} from "@/lib/kids-vocabulary/utils";
import storyStyles from "./KidsStories.module.css";

/**
 * Ảnh từ vựng tab Truyện — pictogram ARASAAC, fallback OpenMoji/Twemoji.
 */
export default function VocabWordImage({ word, imageUrl, className }) {
  const primary = imageUrl || kidWordImageUrl(word);
  const [src, setSrc] = useState(primary);
  const [step, setStep] = useState(0);

  function onError() {
    if (step === 0) {
      setSrc(kidWordOpenmojiImageUrl(word));
      setStep(1);
      return;
    }
    if (step === 1) {
      setSrc(kidWordTwemojiImageUrl(word));
      setStep(2);
    }
  }

  return (
    <div className={storyStyles.vocabImgWrap}>
      <img
        src={src}
        alt=""
        className={className || storyStyles.vocabImg}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    </div>
  );
}
