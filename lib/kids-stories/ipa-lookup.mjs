import { dictionary as cmuDictionary } from "cmu-pronouncing-dictionary";

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

const ARPABET_MAP = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ",
  B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "e", ER: "ɝ", EY: "eɪ",
  F: "f", G: "g", HH: "h", IH: "ɪ", IY: "i", JH: "dʒ", K: "k",
  L: "l", M: "m", N: "n", NG: "ŋ", OW: "oʊ", OY: "ɔɪ", P: "p",
  R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", UH: "ʊ", UW: "u",
  V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

export function arpabetToIpa(arpabet) {
  const tokens = String(arpabet || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  const out = tokens.map((t) => {
    const stress = t.match(/[12]/)?.[0] || "";
    const key = t.replace(/[0-9]/g, "");
    const ipa = ARPABET_MAP[key] || "";
    if (!ipa) return "";
    if (stress === "1") return `ˈ${ipa}`;
    if (stress === "2") return `ˌ${ipa}`;
    return ipa;
  });
  const joined = out.join("");
  return joined ? `/${joined}/` : "";
}

export function ipaFromCmu(word) {
  const arpabet = cmuDictionary[String(word || "").toLowerCase()];
  if (!arpabet) return "";
  return arpabetToIpa(arpabet);
}

export function lemmaCandidates(rawWord) {
  const word = String(rawWord || "").toLowerCase().trim();
  if (!word) return [];
  const out = [word];
  if (word.endsWith("ies") && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 3) out.push(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) out.push(word.slice(0, -1));
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    out.push(base, `${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) out.push(base.slice(0, -1));
  }
  if (word.endsWith("ied") && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    out.push(base, `${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) out.push(base.slice(0, -1));
  }
  return [...new Set(out)];
}

export function resolveIpa(word) {
  for (const lemma of lemmaCandidates(word)) {
    const ipa = ipaFromCmu(lemma);
    if (ipa) return ipa;
  }
  return "";
}

export async function fetchIpaFromDictionary(word) {
  try {
    const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);
    if (!res.ok) return "";
    const json = await res.json();
    const first = json?.[0] || {};
    const direct = String(first.phonetic || "").trim();
    if (direct) return direct.startsWith("/") ? direct : `/${direct.replace(/\//g, "")}/`;
    const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];
    for (const p of phonetics) {
      const text = String(p?.text || "").trim();
      if (text) return text.startsWith("/") ? text : `/${text.replace(/\//g, "")}/`;
    }
    return "";
  } catch {
    return "";
  }
}

export async function resolveIpaFull(word) {
  let ipa = resolveIpa(word);
  if (ipa) return ipa;
  for (const lemma of lemmaCandidates(word)) {
    ipa = await fetchIpaFromDictionary(lemma);
    if (ipa) return ipa;
  }
  return "";
}
