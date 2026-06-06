import {
  hasVietnameseForTts,
  prepareVietnameseTtsText,
} from "../lib/vbee/prepare-vietnamese-tts-text.js";

const sample =
  "Con nói gần đúng rồi. Khi nói thích mèo nói chung, mình dùng 'cats' số nhiều.";
const prepared = prepareVietnameseTtsText(sample);

console.assert(hasVietnameseForTts(sample), "Vietnamese sample should pass");
console.assert(
  prepared.includes("<english>cats</english>"),
  "Should wrap quoted English"
);
console.assert(
  !hasVietnameseForTts("Your question is already good."),
  "English-only should fail"
);
console.log("OK", prepared);
