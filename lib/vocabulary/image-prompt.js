/** Beego vocabulary illustration — consistent educational style. */
import { buildStableVocabImageUrl } from "./stable-image-url.js";

export const BEEGO_IMAGE_STYLE = "beego_edu_illustration_v1";

const STYLE_GUIDE =
  "Friendly flat educational illustration, clean white background, soft blue and honey-yellow accents, simple shapes, no text, no watermark, child-friendly but professional, Beego brand.";

function cleanText(value, max = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function meaningOf(row) {
  return cleanText(row?.vietnamese_meaning || row?.meaning || "");
}

function topicOf(row) {
  return cleanText(row?.topic || "");
}

function exampleOf(row) {
  return cleanText(row?.example_sentence || "");
}

/** Map Vietnamese gloss to a concrete English visual tag for image search. */
function visualTagFromMeaning(meaning, word) {
  const m = String(meaning || "").toLowerCase();
  const w = String(word || "").toLowerCase();

  const pairs = [
    ["con mèo", "cat"],
    ["con chó", "dog"],
    ["con gà", "chicken"],
    ["con bò", "cow"],
    ["con heo", "pig"],
    ["con vịt", "duck"],
    ["con cá", "fish"],
    ["con chim", "bird"],
    ["con ong", "bee"],
    ["con voi", "elephant"],
    ["con hổ", "tiger"],
    ["con sư tử", "lion"],
    ["con khỉ", "monkey"],
    ["con thỏ", "rabbit"],
    ["con chuột", "mouse"],
    ["con rắn", "snake"],
    ["con ếch", "frog"],
    ["con bướm", "butterfly"],
    ["quả táo", "apple"],
    ["quả cam", "orange"],
    ["quả chuối", "banana"],
    ["quả dưa", "watermelon"],
    ["quả nho", "grape"],
    ["quả dâu", "strawberry"],
    ["cây", "tree"],
    ["hoa", "flower"],
    ["nhà", "house"],
    ["trường", "school"],
    ["xe", "car"],
    ["máy bay", "airplane"],
    ["tàu", "ship"],
    ["xe đạp", "bicycle"],
    ["bút", "pen"],
    ["sách", "book"],
    ["bàn", "table"],
    ["ghế", "chair"],
    ["cửa", "door"],
    ["nước", "water"],
    ["sữa", "milk"],
    ["bánh", "cake"],
    ["cơm", "rice"],
    ["phở", "noodle"],
    ["cà phê", "coffee"],
    ["trà", "tea"],
    ["mặt trời", "sun"],
    ["mưa", "rain"],
    ["tuyết", "snow"],
    ["biển", "ocean"],
    ["núi", "mountain"],
    ["vui", "happy"],
    ["buồn", "sad"],
    ["giận", "angry"],
    ["sợ", "afraid"],
    ["mệt", "tired"],
    ["đói", "hungry"],
    ["chạy", "running"],
    ["đi", "walking"],
    ["ăn", "eating"],
    ["uống", "drinking"],
    ["ngủ", "sleeping"],
    ["đọc", "reading"],
    ["viết", "writing"],
    ["hát", "singing"],
    ["nhảy", "dancing"],
    ["bơi", "swimming"],
    ["nấu", "cooking"],
    ["học", "studying"],
    ["làm việc", "working"],
    ["chơi", "playing"],
    ["mua", "shopping"],
    ["to", "big"],
    ["nhỏ", "small"],
    ["nóng", "hot"],
    ["lạnh", "cold"],
    ["đẹp", "beautiful"],
    ["xấu", "ugly"],
    ["nhanh", "fast"],
    ["chậm", "slow"],
  ];

  for (const [needle, tag] of pairs) {
    if (m.includes(needle)) return tag;
  }

  const firstWord = m.split(/[,;]/)[0]?.trim().split(/\s+/).slice(-2).join(" ");
  if (firstWord && firstWord.length >= 2) {
    return firstWord
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/gi, "")
      .trim()
      .split(/\s+/)
      .slice(-1)[0] || w;
  }

  return w || "object";
}

function topicVisualTag(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("động vật") || t.includes("animal")) return "animal";
  if (t.includes("thức ăn") || t.includes("đồ ăn") || t.includes("ăn uống") || t.includes("food"))
    return "food";
  if (t.includes("trái cây") || t.includes("hoa quả") || t.includes("fruit")) return "fruit";
  if (t.includes("trường") || t.includes("school")) return "school";
  if (t.includes("gia đình") || t.includes("family")) return "family";
  if (t.includes("thể thao") || t.includes("sport")) return "sport";
  if (t.includes("thiên nhiên") || t.includes("nature")) return "nature";
  if (t.includes("phương tiện") || t.includes("vehicle")) return "vehicle";
  if (t.includes("công việc") || t.includes("nghề")) return "job";
  if (t.includes("cảm xúc") || t.includes("emotion")) return "emotion";
  if (t.includes("màu")) return "color";
  return "education";
}

/**
 * @param {object} row vocabulary row
 * @returns {string}
 */
export function buildSemanticHint(row) {
  const word = cleanText(row?.word);
  const meaning = meaningOf(row);
  const topic = topicOf(row);
  const example = exampleOf(row);
  const pos = String(row?.part_of_speech || "other").toLowerCase();

  if (pos === "noun") {
    return `Danh từ "${word}" (${meaning || "nghĩa tiếng Việt"}). Chủ đề: ${topic || "tổng quát"}. Một chủ thể duy nhất, rõ ràng, dễ nhận biết.`;
  }
  if (pos === "verb") {
    return `Động từ "${word}" (${meaning || "hành động"}). Ví dụ: ${example || "—"}. Thể hiện hành động rõ ràng, dễ hiểu.`;
  }
  if (pos === "adjective") {
    return `Tính từ "${word}" (${meaning || "đặc tính"}). Minh họa trạng thái/cảm xúc/đặc điểm trực quan.`;
  }
  return `Từ "${word}" (${meaning || "khái niệm"}). Minh họa đơn giản, trực quan cho người học tiếng Anh.`;
}

/**
 * @param {object} row vocabulary row
 * @returns {string}
 */
export function buildImagePrompt(row) {
  const word = cleanText(row?.word);
  const meaning = meaningOf(row);
  const pos = String(row?.part_of_speech || "other").toLowerCase();
  const hint = buildSemanticHint(row);

  const header = `Educational vocabulary illustration. English word: "${word}". Vietnamese meaning: "${meaning}". ${hint}`;

  if (pos === "noun") {
    return `${header} Composition: ONE clear subject centered, isolated, easy to recognize. ${STYLE_GUIDE}`;
  }
  if (pos === "verb") {
    return `${header} Composition: a friendly character clearly performing the action. ${STYLE_GUIDE}`;
  }
  if (pos === "adjective") {
    return `${header} Composition: visual state or emotion that expresses the adjective clearly. ${STYLE_GUIDE}`;
  }
  return `${header} Composition: simple metaphorical scene for an abstract concept. ${STYLE_GUIDE}`;
}

/**
 * Search tags for placeholder/CDN image providers (semantic, not random English word only).
 * @param {object} row
 * @returns {string[]}
 */
export function buildImageSearchTags(row) {
  const word = cleanText(row?.word);
  const meaning = meaningOf(row);
  const pos = String(row?.part_of_speech || "other").toLowerCase();
  const topicTag = topicVisualTag(topicOf(row));
  const visual = visualTagFromMeaning(meaning, word);

  const tags = [visual, topicTag, "cartoon", "education"];
  if (pos === "verb") tags.push("action");
  if (pos === "adjective") tags.push("emotion");
  if (pos === "noun") tags.push("object");

  return [...new Set(tags.filter(Boolean))];
}

/**
 * @param {object} row
 * @returns {object}
 */
export function buildVocabularyImageMetadata(row) {
  const semantic_hint = buildSemanticHint(row);
  const image_prompt = buildImagePrompt(row);
  const image_style = BEEGO_IMAGE_STYLE;
  const searchTags = buildImageSearchTags(row);
  const image_url = buildStableVocabImageUrl(row);

  return {
    semantic_hint,
    image_prompt,
    image_style,
    image_url,
    image_status: "pending",
  };
}
