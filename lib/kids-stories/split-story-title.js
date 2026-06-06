const VI_CHARS =
  "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ";
const VI_RE = new RegExp(`[\\u0100-\\u024f\\u1e00-\\u1eff${VI_CHARS}]`, "i");
const VI_ONLY_RE = new RegExp(`^[\\s${VI_CHARS}\\u0100-\\u024f\\u1e00-\\u1eff0-9.,'’"!?()-]+$`, "i");

function cleanTitle(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

/** Tiêu đề bị lặp 2 lần dính liền (lỗi import docx). */
function dedupeGluedTitle(text) {
  const t = cleanTitle(text);
  if (t.length < 24) return t;
  const half = Math.floor(t.length / 2);
  const a = t.slice(0, half).trim();
  const b = t.slice(half).trim();
  if (a.length >= 8 && a === b) return a;
  return t;
}

function viDensity(s) {
  const chars = [...s.replace(/\s/g, "")];
  if (!chars.length) return 0;
  return chars.filter((c) => VI_RE.test(c)).length / chars.length;
}

/** Tách / sửa titleEn + titleVi bị dính hoặc cắt sai (docx import). */
export function splitStoryTitle(titleEn, titleVi) {
  let en = dedupeGluedTitle(titleEn);
  let vi = dedupeGluedTitle(titleVi);

  const enHasVi = VI_RE.test(en);
  const viContinuesEn = vi.length > 0 && /^[ửệốạảấầậẩẫếểễớờợởỡúụủũậếĩ]/i.test(vi);

  if (enHasVi || viContinuesEn || (en && vi && en.includes(vi.slice(0, 4)))) {
    const combined = cleanTitle(`${en}${vi}`);
    const split = splitOneTitle(combined);
    en = split.titleEn;
    vi = split.titleVi;
    if (viContinuesEn && /^[ửệốạảấầậẩẫếểễớờợởỡúụủũậếĩ]/.test(vi)) {
      const fallback = { titleEn: combined, titleVi: combined };
      en = fallback.titleEn;
      vi = fallback.titleVi;
    }
  } else if (!vi || vi === en) {
    const split = splitOneTitle(en);
    en = split.titleEn;
    vi = split.titleVi;
  }

  if (!en) en = vi || "Story";
  if (!vi) vi = en;

  return { titleEn: en, titleVi: vi };
}

function tryWordGlue(text) {
  const enOnly = /^[A-Za-z0-9'’\s.,:!?()-]+$/;
  const viStart = /^[A-Z][a-z]{0,3}[\u0100-\u1EF9\u00C0-\u00FF\u1E00-\u1EFF]/;
  for (let i = 1; i < text.length - 4; i++) {
    const tail = text.slice(i);
    if (!viStart.test(tail)) continue;
    const en = text.slice(0, i);
    if (en.length < 4 || VI_RE.test(en) || !enOnly.test(en)) continue;
    return { titleEn: cleanTitle(en), titleVi: cleanTitle(tail) };
  }
  return null;
}

function splitOneTitle(raw) {
  const text = dedupeGluedTitle(raw);
  if (!text) return { titleEn: "", titleVi: "" };

  const bellChi = text.match(/^(.+?BELL)(.+)$/i);
  if (bellChi && VI_RE.test(bellChi[2])) {
    return { titleEn: cleanTitle(bellChi[1]), titleVi: cleanTitle(bellChi[2]) };
  }

  if (viDensity(text) >= 0.06 && VI_RE.test(text.slice(0, 30)) && !/^[A-Z][a-z]+(\s|$)/.test(text)) {
    return { titleEn: text, titleVi: text };
  }

  const gluedWord = tryWordGlue(text);
  if (gluedWord) return gluedWord;

  const paren = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const en = cleanTitle(paren[1]);
    const vi = cleanTitle(paren[2]);
    if (VI_RE.test(vi)) return { titleEn: en, titleVi: vi };
  }

  const glued = text.match(
    new RegExp(`^([A-Za-z0-9'’\\-\\s.,:!?]+?)(([${VI_CHARS}\\u0100-\\u024f\\u1e00-\\u1eff]).+)$`, "i")
  );
  if (glued) {
    const en = cleanTitle(glued[1]);
    const vi = cleanTitle(glued[2]);
    if (en.length >= 3 && vi.length >= 3) return { titleEn: en, titleVi: vi };
  }

  const dup = text.match(/^(.+?)([A-Z][a-z].*)$/);
  if (dup && VI_RE.test(dup[2]) && dup[1].length >= 8) {
    const en = cleanTitle(dup[1]);
    const vi = cleanTitle(dup[2]);
    if (vi.length >= 4) return { titleEn: en, titleVi: vi };
  }

  if (viDensity(text) >= 0.08 && VI_RE.test(text.slice(0, 24))) {
    if (VI_ONLY_RE.test(text) || viDensity(text) >= 0.15) {
      return { titleEn: text, titleVi: text };
    }
  }

  const idx = text.search(VI_RE);
  if (idx > 0) {
    const en = cleanTitle(text.slice(0, idx));
    const vi = cleanTitle(text.slice(idx));
    if (en.length >= 4 && vi.length >= 4 && !/^[ửệốạảấầậẩẫếểễớờợởỡúụủũ]/i.test(vi)) {
      return { titleEn: en, titleVi: vi };
    }
    if (en.length >= 4 && vi.length >= 2 && /^[ửệốạảấầậẩẫếểễớờợởỡúụủũ]/i.test(vi)) {
      return splitOneTitle(en + vi);
    }
  }

  return { titleEn: text, titleVi: text };
}
