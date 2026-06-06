/**
 * Import 40 truyện cười từ cau-truyen.txt → cau-truyen-stories.generated.json
 * Chạy: npm run build:cau-truyen-stories
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "cau-truyen.txt");
const OUT = path.join(ROOT, "lib", "kids-stories", "cau-truyen-stories.generated.json");

const EMOJI_MAP = [
  [/dog|puppy|bobby/i, "🐶"],
  [/cat|mimi/i, "🐱"],
  [/mouse|tiny/i, "🐭"],
  [/bird|pip|parrot|owl|chicken/i, "🐦"],
  [/monkey|momo/i, "🐵"],
  [/elephant|ellie/i, "🐘"],
  [/rabbit|ruby/i, "🐰"],
  [/turtle|toto/i, "🐢"],
  [/frog|freddy/i, "🐸"],
  [/pig|poppy/i, "🐷"],
  [/duck|ducky/i, "🦆"],
  [/bear|benny/i, "🐻"],
  [/crab|coco/i, "🦀"],
  [/giraffe|gigi/i, "🦒"],
  [/horse|harry/i, "🐴"],
  [/goat|gary|nelly/i, "🐐"],
  [/fox|roxy/i, "🦊"],
  [/cow|molly/i, "🐮"],
  [/camel|cami/i, "🐫"],
  [/raccoon|ricky/i, "🦝"],
  [/zebra|zippy/i, "🦓"],
  [/ant|andy/i, "🐜"],
  [/fish|finn/i, "🐟"],
  [/whale|wally/i, "🐋"],
  [/seal|sammy/i, "🦭"],
  [/deer|daisy/i, "🦌"],
  [/lion|leo/i, "🦁"],
  [/squirrel|sammy/i, "🐿️"],
  [/penguin|penny/i, "🐧"],
  [/cheese|banana|food|cookie|sandwich/i, "🍕"],
];
const COLORS = ["#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#8338ec", "#ff9f1c", "#2a9d8f", "#e76f51"];
const STOP = new Set(
  "the a an and or but in on at to for of with he she it they we you i his her their my your was were is are be been had has have do did will would could should that this then when what who how all one two not no so if as by from up out about into over after before very just said says".split(
    " "
  )
);

function pickEmoji(title) {
  for (const [pat, em] of EMOJI_MAP) {
    if (pat.test(title)) return em;
  }
  return "😄";
}

function slugify(title, num) {
  const s = title
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cuoi-${String(num).padStart(2, "0")}-${s}`.slice(0, 72);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-Z"“‘])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toParagraphs(enLines, viLines) {
  const enText = enLines.join("\n").trim();
  const viText = viLines.join("\n").trim();

  let enParts;
  if (enLines.length > 4 && enLines.every((l) => l.length < 200)) {
    enParts = enLines.map((l) => l.trim()).filter(Boolean);
  } else if (enLines.length === 1) {
    enParts = splitSentences(enText);
  } else {
    const avg = enText.length / enLines.length;
    enParts = avg > 180 ? splitSentences(enText) : enLines.map((l) => l.trim()).filter(Boolean);
  }

  let viParts;
  if (viLines.length > 4 && viLines.every((l) => l.length < 200)) {
    viParts = viLines.map((l) => l.trim()).filter(Boolean);
  } else if (viLines.length === 1) {
    viParts = splitSentences(viText);
  } else {
    const avg = viText.length / viLines.length;
    viParts = avg > 180 ? splitSentences(viText) : viLines.map((l) => l.trim()).filter(Boolean);
  }

  const n = Math.max(enParts.length, 1);
  const paragraphs = [];
  for (let i = 0; i < n; i++) {
    paragraphs.push({
      en: enParts[i] || enParts[enParts.length - 1] || "",
      vi: viParts[i] || viParts[viParts.length - 1] || "",
    });
  }
  return paragraphs.filter((p) => p.en);
}

function parseVocab(lines) {
  const words = [];
  const meanings = {};
  for (const line of lines) {
    const m = line.match(/^\d+\.\s*([a-zA-Z][\w\s-]*?):\s*(.+)$/);
    if (!m) continue;
    const word = m[1].trim().toLowerCase();
    words.push(word);
    meanings[word] = m[2].trim();
  }
  return { words, meanings };
}

function parseQuestions(lines) {
  return lines
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter((l) => l.length > 3 && /\?$/.test(l));
}

function makeGames(sentences, words) {
  const w10 = words.length ? [...words, ...words].slice(0, 10) : ["story"];
  const blanks = [];
  for (let i = 0; i < sentences.length && blanks.length < 10; i++) {
    if (!words.length) break;
    const target = words[i % words.length];
    if (!new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(sentences[i])) continue;
    const prompt = sentences[i].replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "______");
    if (!prompt.includes("______")) continue;
    const opts = [target];
    for (const w of words) {
      if (w !== target && !opts.includes(w)) opts.push(w);
      if (opts.length >= 3) break;
    }
    while (opts.length < 3) opts.push("word");
    blanks.push({ prompt, promptVi: "", options: opts.slice(0, 3), correctIndex: 0 });
  }
  while (blanks.length < 10 && words.length) {
    const w = words[blanks.length % words.length];
    const others = words.filter((x) => x !== w).slice(0, 2);
    while (others.length < 2) others.push("thing");
    blanks.push({
      prompt: "In this story, an important word is ______.",
      promptVi: "Trong truyện này, một từ quan trọng là ______.",
      options: [w, others[0], others[1]],
      correctIndex: 0,
    });
  }
  return { listenChoose: w10, dragDrop: w10, fillBlank: blanks.slice(0, 10) };
}

function guessAnswerOptions(q, words, titleEn) {
  const name = titleEn.match(/^(\w+)/)?.[1];
  const pool = [...new Set([name, ...words].filter(Boolean))];
  const correct = pool[0] || "Yes";
  const wrong = pool.slice(1, 3);
  while (wrong.length < 2) wrong.push("No", "Maybe");
  return [correct, wrong[0], wrong[1]].slice(0, 3);
}

function makeQuestions(titleEn, titleVi, sentences, comprehension, vocabularyWords) {
  const fromComp = comprehension.slice(0, 4).map((q, i) => ({
    id: `q${i + 1}`,
    questionEn: q,
    questionVi: `Câu ${i + 1}: ${q}`,
    options: guessAnswerOptions(q, vocabularyWords, titleEn),
    correctIndex: 0,
  }));
  if (fromComp.length >= 4) return fromComp;

  const first = sentences[0] || titleEn;
  const opt0 = first.length > 80 ? `${first.slice(0, 80)}…` : first;
  const base = [
    {
      id: "q1",
      questionVi: "Truyện này tên gì?",
      questionEn: "What is the name of this story?",
      options: [titleEn, "The Blue Sky", "The Red Hat"],
      correctIndex: 0,
    },
    {
      id: "q2",
      questionVi: "Bạn thích truyện cười này không?",
      questionEn: "Do you enjoy this funny story?",
      options: ["Yes, I like it!", "No, never", "I don't know"],
      correctIndex: 0,
    },
    {
      id: "q3",
      questionVi: "Câu đầu truyện nói về điều gì?",
      questionEn: "What does the story begin with?",
      options: [opt0, "A car drives fast", "A book on the table"],
      correctIndex: 0,
    },
    {
      id: "q4",
      questionVi: "Truyện này vui không?",
      questionEn: "Is this story funny?",
      options: ["Yes, very funny!", "No, it is sad", "It is scary"],
      correctIndex: 0,
    },
  ];
  return [...fromComp, ...base].slice(0, 4).map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

function parseStories(raw) {
  const blocks = raw.split(/^STORY\s+(\d+):\s*(.+)$/m);
  const stories = [];
  for (let i = 1; i < blocks.length; i += 3) {
    const num = Number(blocks[i]);
    const titleEn = blocks[i + 1].trim();
    const body = blocks[i + 2] || "";
    if (!num || !titleEn) continue;

    const sections = { en: [], vi: [], vocab: [], questions: [] };
    let section = null;
    for (const line of body.split(/\r?\n/)) {
      const t = line.trim();
      if (/^=+$/.test(t) || /^-+$/.test(t)) continue;
      if (/^1\.\s+NOI DUNG/i.test(t)) {
        section = "en";
        continue;
      }
      if (/^2\.\s+BAN DICH/i.test(t)) {
        section = "vi";
        continue;
      }
      if (/^3\.\s+TU VUNG/i.test(t)) {
        section = "vocab";
        continue;
      }
      if (/^4\.\s+CAU HOI/i.test(t)) {
        section = "questions";
        continue;
      }
      if (!section || !t) continue;
      sections[section].push(t);
    }

    const { words: vocabularyWords, meanings: vocabMeanings } = parseVocab(sections.vocab);
    const paragraphs = toParagraphs(sections.en, sections.vi);
    const sentences = paragraphs.map((p) => p.en);
    const comprehension = parseQuestions(sections.questions);

    const vocabFinal =
      vocabularyWords.length > 0
        ? vocabularyWords
        : [...new Set(sentences.join(" ").toLowerCase().match(/[a-z']{3,}/g) || [])]
            .filter((w) => !STOP.has(w))
            .slice(0, 10);

    stories.push({
      num: String(num),
      id: slugify(titleEn, num),
      titleEn,
      titleVi: titleEn,
      emoji: pickEmoji(titleEn),
      color: COLORS[(num - 1) % COLORS.length],
      vocabularyWords: vocabFinal,
      vocabMeanings,
      paragraphs,
      questions: makeQuestions(titleEn, titleEn, sentences, comprehension, vocabFinal),
      games: makeGames(sentences, vocabFinal),
      listCategory: "cuoi",
    });
  }
  return stories.sort((a, b) => Number(a.num) - Number(b.num));
}

function build() {
  const raw = fs.readFileSync(SRC, "utf8");
  const out = parseStories(raw);
  const json = JSON.stringify(out, null, 2);
  fs.writeFileSync(OUT, json, "utf8");
  console.log(`Wrote ${(json.length / 1024).toFixed(1)} KB, ${out.length} stories → ${OUT}`);
  console.log(`Stories: ${out.map((s) => s.id).join(", ")}`);
  console.log(`VI paired: ${out.filter((s) => s.paragraphs.some((p) => p.vi)).length}/${out.length}`);
}

build();
