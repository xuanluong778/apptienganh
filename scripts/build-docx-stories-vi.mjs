/**
 * Sửa tiêu đề + dịch đoạn truyện EN→VI cho Truyện Hay (docx-stories.generated.json).
 * Chạy: npm run build:docx-stories-vi
 * Tiếp tục dịch (bỏ qua câu đã có): npm run build:docx-stories-vi
 * Giới hạn thử: set LIMIT_STORIES=10
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import { splitStoryTitle } from "../lib/kids-stories/split-story-title.js";
import { translateWithMyMemoryPublicApi } from "../lib/ai/providers/mymemory-translate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STORIES_PATH = path.join(ROOT, "lib", "kids-stories", "docx-stories.generated.json");
const CACHE_PATH = path.join(ROOT, "lib", "kids-stories", "docx-sentence-vi-cache.generated.json");

const { loadEnvConfig } = nextEnv;
loadEnvConfig(ROOT);

const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeVi(text) {
  const t = String(text || "").trim();
  if (!t || t.length < 2) return false;
  if (/warning:|quota exceeded|invalid/i.test(t)) return false;
  return VI_RE.test(t);
}

function patchQuestions(questions, titleEn, titleVi) {
  if (!Array.isArray(questions)) return questions;
  return questions.map((q) => {
    if (!q?.options?.length) return q;
    const opts = [...q.options];
    if (q.id === "q1" && opts[0]) opts[0] = titleEn;
    if (q.id === "q2" && opts[0]) opts[0] = titleVi || titleEn;
    return { ...q, options: opts };
  });
}

async function translateEn(text) {
  const en = String(text || "").trim().slice(0, 480);
  if (!en) return "";
  await sleep(Number(process.env.TRANSLATE_DELAY_MS || 120));
  const vi = await translateWithMyMemoryPublicApi(en);
  return looksLikeVi(vi) ? vi : "";
}

async function main() {
  const stories = JSON.parse(fs.readFileSync(STORIES_PATH, "utf8"));
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  }

  const limitStories = Number(process.env.LIMIT_STORIES || 0);
  const pool = limitStories > 0 ? stories.slice(0, limitStories) : stories;

  const toTranslate = new Set();
  for (const story of pool) {
    const { titleEn, titleVi } = splitStoryTitle(story.titleEn, story.titleVi);
    if (titleEn && (!titleVi || titleVi === titleEn || !looksLikeVi(titleVi))) {
      toTranslate.add(`__title__:${titleEn}`);
    }
    for (const p of story.paragraphs || []) {
      const en = String(p.en || "").trim();
      if (!en) continue;
      if (!String(p.vi || "").trim() && !cache[en]) toTranslate.add(en);
    }
  }

  const queue = [...toTranslate];
  console.log(`Stories: ${pool.length}, cache: ${Object.keys(cache).length}, to translate: ${queue.length}`);

  const concurrency = Number(process.env.TRANSLATE_CONCURRENCY || 6);
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < queue.length) {
      const key = queue[idx];
      idx += 1;
      if (cache[key]) continue;
      const source = key.startsWith("__title__:") ? key.slice(10) : key;
      const vi = await translateEn(source);
      if (vi) {
        cache[key] = vi;
        if (!key.startsWith("__title__:")) cache[source] = vi;
        done += 1;
        if (done % 50 === 0) {
          fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
          console.log(`Translated ${done}/${queue.length}...`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
  console.log(`Cache saved: ${Object.keys(cache).length} entries`);

  let fixedTitles = 0;
  let filledVi = 0;
  for (const story of pool) {
    const { titleEn, titleVi } = splitStoryTitle(story.titleEn, story.titleVi);
    let titleViFinal = titleVi;
    if (!looksLikeVi(titleViFinal) || titleViFinal === titleEn) {
      titleViFinal = cache[`__title__:${titleEn}`] || cache[titleEn] || titleViFinal;
    }
    if (titleEn !== story.titleEn || titleViFinal !== story.titleVi) fixedTitles += 1;
    story.titleEn = titleEn;
    story.titleVi = looksLikeVi(titleViFinal) ? titleViFinal : titleEn;

    story.paragraphs = (story.paragraphs || []).map((p) => {
      const en = String(p.en || "").trim();
      let vi = String(p.vi || "").trim();
      if (!vi && en) {
        vi = cache[en] || "";
        if (vi) filledVi += 1;
      }
      return { en, vi };
    });

    story.questions = patchQuestions(story.questions, story.titleEn, story.titleVi);
  }

  if (limitStories > 0) {
    for (let i = 0; i < pool.length; i++) stories[i] = pool[i];
  } else {
    for (let i = 0; i < stories.length; i++) {
      if (i < pool.length) stories[i] = pool[i];
    }
  }

  fs.writeFileSync(STORIES_PATH, JSON.stringify(stories, null, 2), "utf8");
  console.log(`Fixed titles: ${fixedTitles}, paragraphs with VI: ${filledVi}`);
  console.log(`Wrote ${STORIES_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
