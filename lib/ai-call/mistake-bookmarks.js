const STORAGE_KEY = "beego_ai_call_mistakes";

export function loadMistakeBookmarks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addMistakeBookmark(entry) {
  if (typeof window === "undefined") return false;
  const item = {
    id: `m-${Date.now()}`,
    youSaid: String(entry?.youSaid || "").trim(),
    correct: String(entry?.correct || "").trim(),
    why: Array.isArray(entry?.why) ? entry.why : [],
    addedAt: new Date().toISOString(),
  };
  if (!item.correct && !item.youSaid) return false;
  const list = loadMistakeBookmarks();
  list.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  return true;
}
