/** Chỉ sửa tiêu đề trong docx-stories.generated.json (không dịch). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { splitStoryTitle } from "../lib/kids-stories/split-story-title.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORIES_PATH = path.join(ROOT, "lib", "kids-stories", "docx-stories.generated.json");
const stories = JSON.parse(fs.readFileSync(STORIES_PATH, "utf8"));

let n = 0;
for (const s of stories) {
  const { titleEn, titleVi } = splitStoryTitle(s.titleEn, s.titleVi);
  if (titleEn !== s.titleEn || titleVi !== s.titleVi) n += 1;
  s.titleEn = titleEn;
  s.titleVi = titleVi;
  if (Array.isArray(s.questions)) {
    s.questions = s.questions.map((q) => {
      if (!q?.options?.length) return q;
      const opts = [...q.options];
      if (q.id === "q1") opts[0] = titleEn;
      if (q.id === "q2") opts[0] = titleVi;
      return { ...q, options: opts };
    });
  }
}
fs.writeFileSync(STORIES_PATH, JSON.stringify(stories, null, 2), "utf8");
console.log(`Fixed ${n}/${stories.length} titles`);
