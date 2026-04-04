function getTopicTags(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("động vật") || t.includes("animal")) return ["animal"];
  if (
    t.includes("thức ăn") ||
    t.includes("đồ uống") ||
    t.includes("đồ ăn") ||
    t.includes("nấu nướng") ||
    t.includes("ăn uống")
  )
    return ["food"];
  if (t.includes("nghề nghiệp") || t.includes("công việc")) return ["job"];
  if (t.includes("trường học") || t.includes("học")) return ["school"];
  if (t.includes("thể thao") || t.includes("hoạt động")) return ["sport"];
  if (t.includes("thiên nhiên") || t.includes("môi trường") || t.includes("thời tiết"))
    return ["nature"];
  if (t.includes("quần áo")) return ["clothes"];
  if (t.includes("phương tiện")) return ["vehicle"];
  return ["object"];
}

function slugToken(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")[0];
}

export function buildAiImageUrl(word, topic = "") {
  const safeWord = slugToken(word) || "object";
  const topicTag = getTopicTags(topic)[0] || "object";
  const tags = `${safeWord},${topicTag}`;
  return `https://loremflickr.com/512/512/${tags}?lock=${safeWord}`;
}
