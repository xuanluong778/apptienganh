/**
 * Import 30 truyện từ cau-truyen-cho-be.txt → cho-be-stories.generated.json
 * Chạy: npm run build:cho-be-stories
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "cau-truyen-cho-be.txt");
const OUT = path.join(ROOT, "lib", "kids-stories", "cho-be-stories.generated.json");

const VI_CHAR = /[\u0100-\u024f\u1e00-\u1effàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
/** Emoji con vật theo tiêu đề truyện — thứ tự ưu tiên từ cụ thể → chung. */
const EMOJI_MAP = [
  [/robot/i, "🤖"],
  [/monkey|banana/i, "🐵"],
  [/elephant/i, "🐘"],
  [/giraffe/i, "🦒"],
  [/kangaroo/i, "🦘"],
  [/penguin/i, "🐧"],
  [/chicken/i, "🐔"],
  [/sheep/i, "🐑"],
  [/\bcat\b/i, "🐱"],
  [/\bdog\b/i, "🐶"],
  [/cow/i, "🐮"],
  [/frog/i, "🐸"],
  [/rabbit/i, "🐰"],
  [/pig/i, "🐷"],
  [/duck/i, "🦆"],
  [/bear/i, "🐻"],
  [/mouse/i, "🐭"],
  [/lion/i, "🦁"],
  [/turtle/i, "🐢"],
  [/goat/i, "🐐"],
  [/horse/i, "🐴"],
  [/fish/i, "🐟"],
  [/\bant\b/i, "🐜"],
  [/fox/i, "🦊"],
  [/zebra/i, "🦓"],
  [/owl/i, "🦉"],
  [/snake/i, "🐍"],
  [/crab/i, "🦀"],
  [/donkey/i, "🫏"],
  [/bird/i, "🐦"],
  [/pizza|sandwich|cookie|cake|soup/i, "🍕"],
  [/umbrella|rain/i, "☔"],
  [/school|book|homework/i, "📚"],
];
const COLORS = ["#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#8338ec", "#ff9f1c", "#2a9d8f"];
const STOP = new Set(
  "the a an and or but in on at to for of with he she it they we you i his her their my your was were is are be been had has have do did will would could should that this then when what who how all one two not no so if as by from up out about into over after before very just said says".split(
    " "
  )
);

function pickEmoji(title) {
  for (const [pat, em] of EMOJI_MAP) {
    if (pat.test(title)) return em;
  }
  return "📖";
}

function slugify(title, num) {
  const s = title
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cho-be-${String(num).padStart(2, "0")}-${s}`.slice(0, 72);
}

function parseSection(text, { lang }) {
  const stories = [];
  let current = null;

  const flush = () => {
    if (current) stories.push(current);
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const m = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (m) {
      const num = Number(m[1]);
      if (num < 1 || num > 30) continue;
      const title = m[2].trim();
      if (lang === "en" && /^(Nghe truyện|Bấm vào|Câu hỏi vui|Kéo thả|Bé đọc|Nhận sao)/i.test(title)) continue;
      if (lang === "vi" && !VI_CHAR.test(title)) continue;
      flush();
      current = { num, title, vocab: [], lines: [] };
      continue;
    }
    if (!current) continue;
    const vocabM = line.match(/^Vocabulary:\s*(.+)$/i);
    if (vocabM) {
      current.vocab = vocabM[1]
        .split(/,\s*/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }
    if (line.trim()) current.lines.push(line.trim());
  }
  flush();
  return stories;
}

function makeGames(sentences, words) {
  const w10 = words.length ? [...words, ...words].slice(0, 10) : ["story"];
  const blanks = [];
  for (let i = 0; i < sentences.length && blanks.length < 10; i++) {
    if (!words.length) break;
    const target = words[i % words.length];
    if (!new RegExp(`\\b${target}\\b`, "i").test(sentences[i])) continue;
    const prompt = sentences[i].replace(new RegExp(`\\b${target}\\b`, "i"), "______");
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

function makeQuestions(titleEn, titleVi, sentences) {
  const first = sentences[0] || titleEn;
  const opt0 = first.length > 80 ? `${first.slice(0, 80)}…` : first;
  return [
    {
      id: "q1",
      questionVi: "Truyện này tên gì?",
      questionEn: "What is the name of this story?",
      options: [titleEn, "The Blue Sky", "The Red Hat"],
      correctIndex: 0,
    },
    {
      id: "q2",
      questionVi: "Tên tiếng Việt của truyện là gì?",
      questionEn: "What is the Vietnamese title?",
      options: [titleVi || titleEn, "Chú mèo", "Cô bé"],
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
      questionVi: "Bạn thích truyện này không?",
      questionEn: "Do you enjoy this story?",
      options: ["Yes, I like it!", "No, never", "I don't know"],
      correctIndex: 0,
    },
  ];
}

function splitFile(raw) {
  const viStart = raw.search(/\n1\.\s+Bữa Tiệc Mũ Chuối/);
  const enEnd = raw.search(/\nBạn có thể dùng 30 truyện/);
  const enText = raw.slice(0, enEnd > 0 ? enEnd : viStart > 0 ? viStart : raw.length);
  const viText = viStart >= 0 ? raw.slice(viStart) : "";
  return { enText, viText };
}

function build() {
  const raw = fs.readFileSync(SRC, "utf8");
  const { enText, viText } = splitFile(raw);
  const enStories = parseSection(enText, { lang: "en" });
  const viStories = parseSection(viText, { lang: "vi" });
  const viByNum = new Map(viStories.map((s) => [s.num, s]));

  const out = enStories.map((en, idx) => {
    const vi = viByNum.get(en.num);
    const titleEn = en.title;
    const titleVi = vi?.title || "";
    const enLines = en.lines;
    const viLines = vi?.lines || [];
    const paragraphs = enLines.map((line, i) => ({
      en: line,
      vi: viLines[i] || "",
    }));
    const storyTabText = paragraphs
      .map((p) => p.vi || p.en)
      .filter(Boolean)
      .join(" ");

    const vocabularyWords =
      en.vocab.length > 0
        ? en.vocab
        : [...new Set(enLines.join(" ").toLowerCase().match(/[a-z']{3,}/g) || [])]
            .filter((w) => !STOP.has(w))
            .slice(0, 11);

    const sentences = enLines;
    return {
      num: String(en.num),
      id: slugify(titleEn, en.num),
      titleEn,
      titleVi,
      emoji: pickEmoji(titleEn),
      color: COLORS[idx % COLORS.length],
      vocabularyWords,
      paragraphs,
      storyTabText,
      questions: makeQuestions(titleEn, titleVi, sentences),
      games: makeGames(sentences, vocabularyWords),
      listCategory: "kids",
    };
  });

  const json = JSON.stringify(out, null, 2);
  fs.writeFileSync(OUT, json, "utf8");
  console.log(`Wrote ${(json.length / 1024).toFixed(1)} KB, ${out.length} stories → ${OUT}`);
  console.log(`Stories: ${out.map((s) => s.id).join(", ")}`);
  console.log(`VI paired: ${out.filter((s) => s.paragraphs.some((p) => p.vi)).length}/${out.length}`);
}

build();
