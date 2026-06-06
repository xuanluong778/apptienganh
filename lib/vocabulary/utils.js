export function normalizeForSearch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function vocabImgFallback(word) {
  const seed = encodeURIComponent(String(word || "").toLowerCase());
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export function posLabelVi(pos) {
  if (pos === "noun") return "Danh từ";
  if (pos === "verb") return "Động từ";
  if (pos === "adjective") return "Tính từ";
  return null;
}

export const VOCAB_LEVELS = [
  { value: "beginner", label: "Cơ bản" },
  { value: "elementary", label: "Sơ cấp" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "", label: "Tất cả" },
];
