const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

export function normalizeIpaSlashes(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const body = raw.replace(/^\/+|\/+$/g, "").trim();
  return body ? `/${body}/` : "";
}

export function splitUkUsFromPhonetics(phonetics) {
  const list = Array.isArray(phonetics) ? phonetics : [];
  let ipaUk = "";
  let ipaUs = "";
  let audioUk = "";
  let audioUs = "";

  for (const p of list) {
    const audio = String(p?.audio || "").toLowerCase();
    const text = normalizeIpaSlashes(p?.text);
    if (!text && !p?.audio) continue;
    if (audio.includes("-us") || audio.includes("/us/") || audio.includes("en--us")) {
      if (text && !ipaUs) ipaUs = text;
      if (p.audio && !audioUs) audioUs = p.audio;
    }
    if (
      audio.includes("-uk") ||
      audio.includes("-gb") ||
      audio.includes("en-gb") ||
      audio.includes("/uk/")
    ) {
      if (text && !ipaUk) ipaUk = text;
      if (p.audio && !audioUk) audioUk = p.audio;
    }
  }

  const first = list[0] || {};
  const firstText = normalizeIpaSlashes(first.text);
  const firstAudio = String(first.audio || "").trim();

  if (!ipaUs) ipaUs = firstText;
  if (!ipaUk) ipaUk = firstText || ipaUs;
  if (!audioUs && firstAudio) audioUs = firstAudio;
  if (!audioUk && list[1]?.audio) audioUk = String(list[1].audio);
  if (!audioUk && firstAudio && audioUs !== firstAudio) audioUk = firstAudio;

  return { ipaUk, ipaUs, audioUk, audioUs };
}

function mapPos(apiPos) {
  const p = String(apiPos || "").toLowerCase();
  if (p.includes("noun")) return "noun";
  if (p.includes("verb")) return "verb";
  if (p.includes("adjective")) return "adjective";
  if (p.includes("adverb")) return "adverb";
  return "other";
}

export async function fetchFreeDictionaryEntry(word) {
  const w = String(word || "").trim().toLowerCase();
  if (!w || w.length < 2) return null;
  const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(w)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const entry = Array.isArray(json) ? json[0] : null;
  if (!entry) return null;

  const { ipaUk, ipaUs, audioUk, audioUs } = splitUkUsFromPhonetics(entry.phonetics);
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  let partOfSpeech = "other";
  let exampleSentence = "";
  let definitionHint = "";

  for (const m of meanings) {
    if (!partOfSpeech || partOfSpeech === "other") {
      partOfSpeech = mapPos(m.partOfSpeech);
    }
    const defs = Array.isArray(m.definitions) ? m.definitions : [];
    for (const d of defs) {
      if (!definitionHint && d.definition) definitionHint = String(d.definition).trim();
      if (!exampleSentence && d.example) {
        exampleSentence = String(d.example).trim();
        if (!partOfSpeech || partOfSpeech === "other") {
          partOfSpeech = mapPos(m.partOfSpeech);
        }
        break;
      }
    }
    if (exampleSentence) break;
  }

  const displayWord = String(entry.word || w);
  if (!exampleSentence) {
    exampleSentence =
      partOfSpeech === "verb"
        ? `I can ${displayWord} every day.`
        : partOfSpeech === "adjective"
        ? `It is ${displayWord}.`
        : `This is a ${displayWord}.`;
  }

  return {
    word: displayWord,
    ipaUk: ipaUk || ipaUs || `/${displayWord}/`,
    ipaUs: ipaUs || ipaUk || `/${displayWord}/`,
    audioUk: audioUk || "",
    audioUs: audioUs || "",
    part_of_speech: partOfSpeech,
    example_sentence: exampleSentence,
    definition_hint: definitionHint,
  };
}
