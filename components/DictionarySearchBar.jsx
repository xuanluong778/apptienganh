"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DictionarySearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e) {
    e.preventDefault();
    const word = String(q || "").trim();
    if (word.length < 2) return;
    router.push(`/dictionary?q=${encodeURIComponent(word)}`);
  }

  return (
    <form className="dict-search-form" onSubmit={submit} role="search">
      <label className="dict-search-label" htmlFor="dict-search-input">
        Từ điển
      </label>
      <input
        id="dict-search-input"
        className="dict-search-input"
        type="search"
        enterKeyHint="search"
        placeholder="Nhập từ tiếng Anh..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="dict-search-btn">
        Tra cứu
      </button>
    </form>
  );
}
