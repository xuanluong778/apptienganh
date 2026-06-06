#!/usr/bin/env python3
"""Parse 180-truyen-chem-tieng-anh123.docx into story JSON."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

DOCX = Path(__file__).resolve().parent.parent / "180-truyen-chem-tieng-anh123.docx"
OUT = Path(__file__).resolve().parent.parent / "lib" / "kids-stories" / "parsed-stories.json"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
BLANK = re.compile(r"[.\u2026…]{2,}|\s*\.{3,}\s*")
NUM = re.compile(r"^(\d+)\.(\d+)$")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def extract_paras():
    with zipfile.ZipFile(DOCX) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    paras = []
    for p in root.iter(f"{W}p"):
        parts = []
        for t in p.iter(f"{W}t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        line = "".join(parts).strip()
        if line:
            paras.append(line)
    return paras


def clean_sentence(s: str) -> str:
    s = BLANK.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([,.!?])", r"\1", s)
    return s


def slugify(title: str, num: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{num.replace('.', '-')}-{base}"[:60].strip("-")


def merge_body_lines(lines: list[str]) -> list[str]:
    """Merge broken lines into sentences."""
    text = " ".join(lines)
    text = BLANK.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    parts = SENT_SPLIT.split(text)
    return [p.strip() for p in parts if len(p.strip()) > 8]


def parse_stories(paras: list[str]) -> list[dict]:
    stories = []
    i = 0
    seen_nums = set()

    while i < len(paras):
        m = NUM.match(paras[i])
        if not m:
            i += 1
            continue

        num = paras[i]
        if num in seen_nums:
            i += 1
            continue

        title_en = ""
        title_vi = ""
        j = i + 1

        if j < len(paras) and not NUM.match(paras[j]) and len(paras[j]) < 120:
            title_en = paras[j]
            j += 1

        if j < len(paras) and paras[j] == "(":
            j += 1
            if j < len(paras) and paras[j] != ")":
                title_vi = paras[j]
                j += 1
            if j < len(paras) and paras[j] == ")":
                j += 1

        body_lines = []
        while j < len(paras):
            if NUM.match(paras[j]):
                break
            line = paras[j]
            # skip repeated header
            if line == num or line == title_en or line == "(" or line == ")" or line == title_vi:
                j += 1
                continue
            if title_en and line.endswith(title_en) and "……" in line:
                # combined header+body line — extract after title
                idx = line.find(title_en)
                rest = line[idx + len(title_en) :].strip()
                if rest.startswith("("):
                    rest = re.sub(r"^\([^)]*\)", "", rest).strip()
                if rest:
                    body_lines.append(rest)
                j += 1
                continue
            body_lines.append(line)
            j += 1

        sentences_en = merge_body_lines(body_lines)
        if title_en and sentences_en:
            seen_nums.add(num)
            stories.append(
                {
                    "num": num,
                    "id": slugify(title_en, num),
                    "titleEn": title_en,
                    "titleVi": title_vi or title_en,
                    "paragraphs": [{"en": clean_sentence(s), "vi": ""} for s in sentences_en],
                }
            )
        i = j

    return stories


def main():
    paras = extract_paras()
    stories = parse_stories(paras)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(stories, f, ensure_ascii=False, indent=2)
    print(f"paras={len(paras)} stories={len(stories)} -> {OUT}")


if __name__ == "__main__":
    main()
