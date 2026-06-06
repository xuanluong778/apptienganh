#!/usr/bin/env python3
"""Build kids fun stories from 180-truyen-chem-tieng-anh123.docx."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCX = ROOT / "180-truyen-chem-tieng-anh123.docx"
OUT = ROOT / "lib" / "kids-stories" / "docx-stories.generated.json"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
BLANK = re.compile(r"[.\u2026…]{2,}|\s*\.{3,}\s*|\d+…+")
STORY_MARK = re.compile(r"(?<!\d)(\d{1,2}\.\d{1,2})(?=[A-Z(\u0100-\u024f])")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
VI_EXTRA = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ"
VI_CHAR = re.compile(rf"[\u0100-\u024f\u1e00-\u1eff{VI_EXTRA}]")
STOP = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "he", "she", "it", "they", "we", "you", "i", "his", "her", "their", "my", "your",
    "was", "were", "is", "are", "be", "been", "had", "has", "have", "do", "did", "will",
    "would", "could", "should", "that", "this", "then", "when", "what", "who", "how",
    "all", "one", "two", "not", "no", "so", "if", "as", "by", "from", "up", "out",
    "about", "into", "over", "after", "before", "very", "just", "said", "says",
}
EMOJI_MAP = [
    (r"lion|tiger|bear|wolf|fox|dog|cat|rabbit|monkey|bird|fish|peacock|turtle", "🐾"),
    (r"princess|prince|king|queen|castle", "👑"),
    (r"ghost|monster|witch", "👻"),
    (r"moon|sun|star|space|planet", "🌙"),
    (r"ocean|river|water|rain|beach", "🌊"),
    (r"forest|tree|flower", "🌳"),
    (r"school|book|report|read", "📚"),
    (r"gold|money|treasure", "💰"),
    (r"race|run", "🏃"),
    (r"food|banana|eat", "🍌"),
]
COLORS = ["#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#8338ec", "#ff9f1c", "#2a9d8f"]


def read_blob() -> str:
    with zipfile.ZipFile(DOCX) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    lines = []
    for p in root.iter(f"{W}p"):
        parts = []
        for t in p.iter(f"{W}t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        line = "".join(parts).strip()
        if line:
            lines.append(line)
    return "\n".join(lines)


def slugify(title: str, num: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"story-{num.replace('.', '-')}-{s}"[:72].strip("-")


def clean_text(text: str) -> str:
    text = BLANK.sub(" ", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.!?\"'])", r"\1", text)
    text = re.sub(r"lio5he", "lion in the", text)
    text = re.sub(r"in-the", "in the", text)
    text = re.sub(r"forest-were", "forest were", text)
    return text.strip()


def split_sentences(text: str) -> list[str]:
    text = clean_text(text)
    parts = [p.strip() for p in SENT_SPLIT.split(text) if len(p.strip()) > 12]
    out = []
    for p in parts:
        if len(p) > 280:
            subs = re.split(r",\s+(?=[A-Z\"'])", p)
            out.extend(s.strip() for s in subs if len(s.strip()) > 12)
        else:
            out.append(p)
    return out[:40]


def pick_emoji(title: str) -> str:
    t = title.lower()
    for pat, em in EMOJI_MAP:
        if re.search(pat, t):
            return em
    return "📖"


def top_words(sentences: list[str], n=11) -> list[str]:
    freq = {}
    for s in sentences:
        for w in re.findall(r"[A-Za-z']{3,}", s.lower()):
            if w in STOP or w.isdigit():
                continue
            freq[w] = freq.get(w, 0) + 1
    ranked = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    return [w for w, _ in ranked[:n]]


def make_games(sentences: list[str], words: list[str]):
    w10 = (words * 2)[:10] if words else ["story"] * 10
    blanks = []
    for i, s in enumerate(sentences[:12]):
        if not words:
            break
        target = words[i % len(words)]
        if target.lower() not in s.lower():
            continue
        prompt = re.sub(re.escape(target), "______", s, count=1, flags=re.I)
        if "______" not in prompt:
            continue
        opts = [target]
        for w in words:
            if w != target and w not in opts:
                opts.append(w)
            if len(opts) >= 3:
                break
        while len(opts) < 3:
            opts.append("word")
        blanks.append({"prompt": prompt, "promptVi": "", "options": opts[:3], "correctIndex": 0})
        if len(blanks) >= 10:
            break
    while len(blanks) < 10 and words:
        w = words[len(blanks) % len(words)]
        others = [x for x in words if x != w][:2]
        while len(others) < 2:
            others.append("thing")
        blanks.append(
            {
                "prompt": f"In this story, an important word is ______.",
                "promptVi": "Trong truyện này, một từ quan trọng là ______.",
                "options": [w, others[0], others[1]],
                "correctIndex": 0,
            }
        )
    return {"listenChoose": w10, "dragDrop": w10, "fillBlank": blanks[:10]}


def make_questions(title_en: str, title_vi: str, sentences: list[str]):
    return [
        {
            "id": "q1",
            "questionVi": "Truyện này tên gì?",
            "questionEn": "What is the name of this story?",
            "options": [title_en, "The Blue Sky", "The Red Hat"],
            "correctIndex": 0,
        },
        {
            "id": "q2",
            "questionVi": "Tên tiếng Việt của truyện là gì?",
            "questionEn": "What is the Vietnamese title?",
            "options": [title_vi or title_en, "Chú mèo", "Cô bé"],
            "correctIndex": 0,
        },
        {
            "id": "q3",
            "questionVi": "Câu đầu truyện nói về điều gì?",
            "questionEn": "What does the story begin with?",
            "options": [
                (sentences[0][:80] + "…") if sentences and len(sentences[0]) > 80 else (sentences[0] if sentences else title_en),
                "A car drives fast",
                "A book on the table",
            ],
            "correctIndex": 0,
        },
        {
            "id": "q4",
            "questionVi": "Bạn thích truyện này không?",
            "questionEn": "Do you enjoy this story?",
            "options": ["Yes, I like it!", "No, never", "I don't know"],
            "correctIndex": 0,
        },
    ]


def split_en_vi_title(raw: str) -> tuple[str, str]:
    raw = clean_text(raw)
    if not raw:
        return "", ""

    paren = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", raw)
    if paren:
        en, vi = clean_text(paren.group(1)), clean_text(paren.group(2))
        if VI_CHAR.search(vi):
            return en, vi

    for i in range(len(raw) - 2, 2, -1):
        if not raw[i].islower() or not raw[i].isascii():
            continue
        if i + 1 >= len(raw) or not raw[i + 1].isupper():
            continue
        en = raw[: i + 1].strip(" -:()")
        vi = raw[i + 1 :].strip()
        if len(en) >= 4 and len(vi) >= 4 and VI_CHAR.search(vi[:8]):
            return en, vi

    vi_chars = len(VI_CHAR.findall(raw))
    if vi_chars >= 2 and VI_CHAR.search(raw[:30]) and not re.match(r"^[A-Z][a-z]+\s", raw):
        return raw, raw

    glued = re.match(
        rf"^([A-Za-z0-9''\-\s.,:!?]+?)([{VI_EXTRA}\u0100-\u024f\u1e00-\u1eff].+)$",
        raw,
        re.I,
    )
    if glued:
        en, vi = glued.group(1).strip(" -:()"), glued.group(2).strip()
        if len(en) >= 3 and len(vi) >= 3:
            return en, vi

    m = VI_CHAR.search(raw)
    if m:
        en = raw[: m.start()].strip(" -:()")
        vi = raw[m.start() :].strip()
        if en and vi and len(vi) >= 3 and not re.match(r"^[ửệốạảấầậẩẫếểễớờợởỡúụủũ]", vi):
            if len(en) < 4:
                return vi, vi
            return en, vi

    return raw, raw


def extract_trailing_title(body: str):
    m = re.search(r"([A-Z][A-Za-z0-9'’\-\s]{3,72}?)\s*\(([^)]+)\)\s*$", body.strip())
    if not m:
        return None
    return clean_text(m.group(1)), clean_text(m.group(2)), body[: m.start()].strip()


def parse_title_and_body(chunk: str) -> tuple[str, str, str]:
    chunk = chunk.lstrip()

    m0 = re.match(r"^(.+?)\(([^)]+)\)\s*", chunk)
    if m0:
        title_en = clean_text(m0.group(1))
        title_vi = clean_text(m0.group(2))
        if VI_CHAR.search(title_vi):
            return title_en, title_vi, chunk[m0.end() :]

    if chunk.startswith("("):
        m = re.match(r"^\(([^)]+)\)\s*", chunk)
        if m:
            title_en, title_vi = split_en_vi_title(m.group(1))
            return title_en, title_vi, chunk[m.end() :]

    if "(" in chunk[:220]:
        idx = chunk.index("(")
        before = chunk[:idx].strip()
        rest = chunk[idx:]
        m = re.match(r"^\(([^)]+)\)\s*", rest)
        if m and len(before) >= 4:
            title_en = clean_text(before)
            title_vi = clean_text(m.group(1))
            return title_en, title_vi, rest[m.end() :]

    trail = extract_trailing_title(chunk)
    if trail:
        return trail

    m = re.match(r"^([A-Z][^.!?\n]{3,90})", chunk)
    if m:
        title_en = clean_text(m.group(1))
        return title_en, title_en, chunk

    return "Story", "Truyện", chunk


def parse_stories(blob: str) -> list[dict]:
    marks = list(STORY_MARK.finditer(blob))
    by_num = {}
    for i, m in enumerate(marks):
        num = m.group(1)
        start = m.end()
        end = marks[i + 1].start() if i + 1 < len(marks) else len(blob)
        chunk = blob[start:end]
        title_en, title_vi, body = parse_title_and_body(chunk)
        if len(title_en) < 4:
            continue
        sentences = split_sentences(body)
        if len(sentences) < 2:
            continue
        words = top_words(sentences)
        candidate = {
            "num": num,
            "id": slugify(title_en, num),
            "titleEn": title_en,
            "titleVi": title_vi,
            "emoji": pick_emoji(title_en + " " + title_vi),
            "color": COLORS[int(num.split(".")[0]) % len(COLORS)],
            "paragraphs": [{"en": s, "vi": ""} for s in sentences],
            "vocabularyWords": words,
            "questions": make_questions(title_en, title_vi, sentences),
            "games": make_games(sentences, words),
        }
        prev = by_num.get(num)
        if not prev or len(sentences) > len(prev["paragraphs"]):
            by_num[num] = candidate
    return [by_num[k] for k in sorted(by_num.keys(), key=lambda x: (int(x.split(".")[0]), int(x.split(".")[1])))]


def main():
    blob = read_blob()
    stories = parse_stories(blob)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(stories, f, ensure_ascii=False, indent=2)
    print(f"stories={len(stories)} -> {OUT}")


if __name__ == "__main__":
    main()
