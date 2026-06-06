const MAX_TEXT_LENGTH = 300;

/** Vietnamese letters with tone marks and đ/Đ. */
const VIETNAMESE_CHAR_RE =
  /[ăâđêôơưĂÂĐÊÔƠƯàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/;

const ENGLISH_TAG_RE = /<english>[\s\S]*?<\/english>/gi;

function stripEnglishTags(text) {
  return String(text || "").replace(ENGLISH_TAG_RE, " ");
}

/**
 * True when the string has meaningful Vietnamese (not English-only help text).
 */
export function hasVietnameseForTts(text) {
  const core = stripEnglishTags(text).normalize("NFC").trim();
  if (!core) return false;
  if (VIETNAMESE_CHAR_RE.test(core)) return true;
  const letters = core.replace(/[^A-Za-zÀ-ỹ]/g, "");
  if (!letters) return false;
  const latinOnly = /^[A-Za-z\s.,!?'"-]+$/.test(core);
  return !latinOnly;
}

function wrapEnglishFragment(word) {
  const w = String(word || "").trim();
  if (!w || w.length > 48) return word;
  if (/^<english>/i.test(w)) return w;
  return `<english>${w}</english>`;
}

/**
 * Wrap quoted English words/phrases for VBEE multilingual pronunciation.
 */
function wrapQuotedEnglish(text) {
  return text.replace(
    /(['"])([A-Za-z][A-Za-z0-9' -]{0,48})\1/g,
    (_match, _quote, word) => wrapEnglishFragment(word)
  );
}

/**
 * Short Latin phrases after colons (e.g. "trả lời: I like dogs").
 */
function wrapColonEnglishPhrases(text) {
  return text.replace(
    /(:\s*)([A-Za-z][A-Za-z0-9' -]{1,48})(?=[.!?,\s]|$)/g,
    (_match, prefix, phrase) => {
      if (/^(con|mình|bạn|ví dụ)$/i.test(phrase)) return _match;
      return `${prefix}${wrapEnglishFragment(phrase)}`;
    }
  );
}

/**
 * Normalize and annotate text for VBEE Vietnamese voice (Realtime API).
 * @see https://api-docs.vbee.vn — use &lt;english&gt; for English inside Vietnamese.
 */
export function prepareVietnameseTtsText(raw) {
  let text = String(raw || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

  if (!text) return "";

  text = wrapQuotedEnglish(text);
  text = wrapColonEnglishPhrases(text);

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
    const openIdx = text.lastIndexOf("<english>");
    const closeIdx = text.lastIndexOf("</english>");
    if (openIdx > closeIdx) {
      text = text.slice(0, openIdx).trim();
    }
  }

  return text;
}
