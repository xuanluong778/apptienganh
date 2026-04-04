import mysql from "mysql2/promise";
import { dictionary as cmuDictionary } from "cmu-pronouncing-dictionary";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

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

function toIpaSlashes(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const body = raw.replace(/^\/+|\/+$/g, "").trim();
  if (!body) return "";
  return `/${body}/`;
}

function normalizeIpa(raw) {
  const body = String(raw || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/\s+/g, "")
    .replace(/ɹ/g, "r")
    .replace(/[()]/g, "")
    .trim();
  return body ? `/${body}/` : "";
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
  return toIpaSlashes(out.join(""));
}

function buildLemmaCandidates(rawWord) {
  const word = String(rawWord || "").toLowerCase().trim();
  if (!word) return [];
  const out = [word];
  if (word.endsWith("ies") && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 3) out.push(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) out.push(word.slice(0, -1));
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    out.push(base, `${base}e`);
  }
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    out.push(base, `${base}e`);
  }
  return [...new Set(out)];
}

async function fetchUsPreferredIpa(word) {
  try {
    const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);
    if (!res.ok) return "";
    const json = await res.json();
    const first = json?.[0] || {};
    const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];

    // 1) Strongly prefer phonetic lines with US audio.
    for (const p of phonetics) {
      const audio = String(p?.audio || "").toLowerCase();
      const text = toIpaSlashes(String(p?.text || ""));
      if (!text) continue;
      if (audio.includes("-us.") || audio.includes("/us/") || audio.includes("en-us")) {
        return normalizeIpa(text);
      }
    }

    // 2) Then any phonetic line marked US in license/source metadata (best effort).
    for (const p of phonetics) {
      const text = toIpaSlashes(String(p?.text || ""));
      if (!text) continue;
      const source = JSON.stringify(p).toLowerCase();
      if (source.includes("us")) return normalizeIpa(text);
    }

    // 3) Fallback to direct phonetic.
    const direct = toIpaSlashes(first.phonetic || "");
    if (direct) return normalizeIpa(direct);

    // 4) Fallback to first usable phonetic.
    for (const p of phonetics) {
      const text = toIpaSlashes(String(p?.text || ""));
      if (text) return normalizeIpa(text);
    }
    return "";
  } catch {
    return "";
  }
}

function fetchCmuIpa(word) {
  const arpabet = cmuDictionary[String(word || "").toLowerCase()];
  if (!arpabet) return "";
  return normalizeIpa(arpabetToIpa(arpabet));
}

async function resolveUsIpa(word, existingIpa) {
  const candidates = buildLemmaCandidates(word);
  for (const c of candidates) {
    const us = await fetchUsPreferredIpa(c);
    if (us) return us;
  }
  for (const c of candidates) {
    const cmu = fetchCmuIpa(c);
    if (cmu) return cmu;
  }
  return normalizeIpa(existingIpa);
}

async function main() {
  const db = await mysql.createConnection(getConfig());
  const [rows] = await db.query(
    "SELECT id, word, ipa FROM vocabulary WHERE word IS NOT NULL AND TRIM(word) <> ''"
  );

  const byWord = new Map();
  for (const row of rows) {
    const key = String(row.word || "").toLowerCase().trim();
    if (!byWord.has(key)) byWord.set(key, row.ipa || "");
  }
  const words = [...byWord.keys()];

  const resultMap = new Map();
  let idx = 0;
  const concurrency = Number(process.env.IPA_BACKFILL_CONCURRENCY || 8);

  async function worker() {
    while (idx < words.length) {
      const i = idx;
      idx += 1;
      const w = words[i];
      const ipa = await resolveUsIpa(w, byWord.get(w));
      if (ipa) resultMap.set(w, ipa);
      if ((i + 1) % 200 === 0) console.log(`resolved ${i + 1}/${words.length}...`);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  let updated = 0;
  for (const row of rows) {
    const key = String(row.word || "").toLowerCase().trim();
    const nextIpa = resultMap.get(key) || "";
    if (!nextIpa) continue;
    if (String(row.ipa || "").trim() === nextIpa) continue;
    await db.query("UPDATE vocabulary SET ipa = ? WHERE id = ?", [nextIpa, row.id]);
    updated += 1;
  }

  console.log(`total_words=${words.length}`);
  console.log(`resolved_words=${resultMap.size}`);
  console.log(`updated_rows=${updated}`);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
