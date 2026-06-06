import { translateWithMyMemoryPublicApi } from "@/lib/ai/providers/mymemory-translate";
import { translateEnglishToVietnameseWithFallback } from "@/lib/ai/services/translate.service";

function hasViDiacritics(text) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text || ""));
}

function looksLikeVi(text, enWord, definition) {
  const vi = String(text || "").trim();
  if (!vi || vi.length < 1) return false;
  if (/^warning:|quota exceeded|invalid/i.test(vi)) return false;
  const en = String(enWord || "").trim().toLowerCase();
  const def = String(definition || "").trim().toLowerCase();
  const low = vi.toLowerCase();
  if (en && low === en) return false;
  if (def && low === def) return false;
  if (hasViDiacritics(vi)) return true;
  if (def && low !== def && vi.length <= 160) return true;
  return false;
}

/** Dịch từ/định nghĩa EN → VI (MyMemory + OpenAI nếu có key). */
export async function translateDefinitionToVi(word, definition) {
  const w = String(word || "").trim();
  const def = String(definition || "").trim();
  const tries = [];
  if (w && def) tries.push(`${w}: ${def}`);
  if (w) tries.push(`nghĩa tiếng Việt của từ "${w}"`);
  if (w) tries.push(`Dịch sang tiếng Việt (một cụm ngắn): ${w}`);
  if (def) tries.push(def);

  for (const text of tries) {
    const vi = await translateWithMyMemoryPublicApi(String(text).slice(0, 480));
    if (looksLikeVi(vi, w, def)) return vi;
  }

  if (w) {
    const ai = await translateEnglishToVietnameseWithFallback(
      `Dịch từ tiếng Anh sang tiếng Việt. Chỉ trả lời nghĩa tiếng Việt ngắn gọn (1–6 từ), không giải thích thêm: ${w}`
    );
    if (looksLikeVi(ai, w, def)) return ai;
    if (def) {
      const aiDef = await translateEnglishToVietnameseWithFallback(
        `Dịch sang tiếng Việt (ngắn gọn): ${w} — ${def}`
      );
      if (looksLikeVi(aiDef, w, def)) return aiDef;
    }
  }

  return "";
}
