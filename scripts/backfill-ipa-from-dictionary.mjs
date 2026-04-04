import mysql from "mysql2/promise";
import { dictionary as cmuDictionary } from "cmu-pronouncing-dictionary";

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const WIKTIONARY_API = "https://en.wiktionary.org/w/api.php";

function getConfig() {
  if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
    };
  }
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "english_app",
  };
}

async function fetchIpa(word) {
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

async function fetchIpaFromWiktionary(word) {
  try {
    const url = `${WIKTIONARY_API}?action=query&format=json&origin=*&prop=extracts&explaintext=1&titles=${encodeURIComponent(
      word
    )}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const json = await res.json();
    const pages = json?.query?.pages || {};
    const firstPage = pages[Object.keys(pages)[0]] || {};
    const extract = String(firstPage.extract || "");
    if (!extract) return "";
    const match = extract.match(/\/[^/\n]{1,40}\//);
    return match ? match[0].trim() : "";
  } catch {
    return "";
  }
}

function arpabetToIpa(arpabet) {
  const MAP = {
    AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ",
    B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "e", ER: "ɝ", EY: "eɪ",
    F: "f", G: "g", HH: "h", IH: "ɪ", IY: "i", JH: "dʒ", K: "k",
    L: "l", M: "m", N: "n", NG: "ŋ", OW: "oʊ", OY: "ɔɪ", P: "p",
    R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", UH: "ʊ", UW: "u",
    V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
  };
  const tokens = String(arpabet || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  const out = tokens.map((t) => {
    const stress = t.match(/[12]/)?.[0] || "";
    const key = t.replace(/[0-9]/g, "");
    const ipa = MAP[key] || "";
    if (!ipa) return "";
    if (stress === "1") return `ˈ${ipa}`;
    if (stress === "2") return `ˌ${ipa}`;
    return ipa;
  });
  const joined = out.join("");
  return joined ? `/${joined}/` : "";
}

function fetchIpaFromCmu(word) {
  const arpabet = cmuDictionary[String(word || "").toLowerCase()];
  if (!arpabet) return "";
  return arpabetToIpa(arpabet);
}

function buildLemmaCandidates(rawWord) {
  const word = String(rawWord || "").toLowerCase().trim();
  if (!word) return [];
  const out = [word];

  // plural -> singular
  if (word.endsWith("ies") && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 3) out.push(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) out.push(word.slice(0, -1));

  // -ing -> base
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    out.push(base);
    out.push(`${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) out.push(base.slice(0, -1));
  }

  // -ed -> base
  if (word.endsWith("ied") && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    out.push(base);
    out.push(`${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) out.push(base.slice(0, -1));
  }

  // adverb -> adjective
  if (word.endsWith("ly") && word.length > 4) out.push(word.slice(0, -2));

  return [...new Set(out.filter((x) => x && x.length > 1))];
}

async function resolveIpaForWord(word) {
  const candidates = buildLemmaCandidates(word);
  for (const c of candidates) {
    let ipa = await fetchIpa(c);
    if (!ipa) ipa = await fetchIpaFromWiktionary(c);
    if (!ipa) ipa = fetchIpaFromCmu(c);
    if (ipa) return ipa;
  }
  return "";
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    "SELECT id, word, ipa FROM vocabulary WHERE word IS NOT NULL AND TRIM(word) <> ''"
  );

  const uniqueWords = [...new Set(rows.map((r) => String(r.word || "").toLowerCase().trim()))].filter(
    Boolean
  );
  console.log(`total_rows=${rows.length}`);
  console.log(`unique_words=${uniqueWords.length}`);

  const ipaMap = new Map();
  const concurrency = Number(process.env.IPA_BACKFILL_CONCURRENCY || 10);
  let idx = 0;
  let fetched = 0;

  async function worker() {
    while (idx < uniqueWords.length) {
      const word = uniqueWords[idx];
      idx += 1;
      const ipa = await resolveIpaForWord(word);
      if (ipa) ipaMap.set(word, ipa);
      fetched += 1;
      if (fetched % 200 === 0) {
        console.log(`fetched ${fetched}/${uniqueWords.length} words...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  let updated = 0;
  for (const row of rows) {
    const key = String(row.word || "").toLowerCase().trim();
    const ipa = ipaMap.get(key) || "";
    if (!ipa) continue;
    if (String(row.ipa || "").trim() === ipa) continue;
    await db.query("UPDATE vocabulary SET ipa = ? WHERE id = ?", [ipa, row.id]);
    updated += 1;
    if (updated % 300 === 0) {
      console.log(`updated ${updated} rows...`);
    }
  }

  console.log(`resolved_ipa_words=${ipaMap.size}`);
  console.log(`updated_rows=${updated}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
