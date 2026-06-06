const STORAGE_KEY = "beego_vocab_bookmarks_v1";

function readSet() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isFinite(n)) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function isBookmarked(wordId) {
  return readSet().has(Number(wordId));
}

export function toggleBookmark(wordId) {
  const id = Number(wordId);
  const set = readSet();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  writeSet(set);
  return set.has(id);
}

export function getBookmarkIds() {
  return [...readSet()];
}
