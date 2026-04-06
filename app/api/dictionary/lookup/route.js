import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureVocabularySchema } from "@/lib/vocabulary/ensure-schema";
import { normalizeMediaUrl } from "@/lib/media-url";
import { buildAiImageUrl } from "@/lib/ai-image-url";
import { getMatchingImageByWord } from "@/lib/matching-image-map";
import { fetchFreeDictionaryEntry } from "@/lib/free-dictionary";

export const runtime = "nodejs";

async function translateWordEnVi(text) {
  const q = String(text || "").trim().slice(0, 200);
  if (!q) return "";
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|vi`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";
    const json = await res.json();
    return String(json?.responseData?.translatedText || "").trim();
  } catch {
    return "";
  }
}

function posLabelVi(pos) {
  if (pos === "noun") return "Danh từ";
  if (pos === "verb") return "Động từ";
  if (pos === "adjective") return "Tính từ";
  if (pos === "adverb") return "Trạng từ";
  return "";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = String(searchParams.get("q") || "").trim();
    const wordKey = raw.toLowerCase().replace(/[^a-z\s'-]/gi, "").trim();
    const single = wordKey.split(/\s+/)[0] || "";

    if (!single || single.length < 2) {
      return NextResponse.json(
        { success: false, message: "Nhập từ tiếng Anh (ít nhất 2 ký tự)." },
        { status: 400 }
      );
    }

    await ensureVocabularySchema(pool);

    const [dbRows] = await pool.query(
      `SELECT id, word, ipa, vietnamese_meaning, part_of_speech, example_sentence, example_sentence_vi,
              example_sentence_ipa, question_text, topic, image_url, audio_url, example_audio_url
       FROM vocabulary
       WHERE LOWER(TRIM(word)) = ?
       LIMIT 1`,
      [single]
    );

    if (dbRows[0]) {
      const row = dbRows[0];
      const w = String(row.word || single);
      const img =
        getMatchingImageByWord(w) ||
        normalizeMediaUrl(row.image_url) ||
        buildAiImageUrl(w, row.topic || "");
      const audioUs = normalizeMediaUrl(row.audio_url) || "";
      const data = {
        source: "database",
        id: row.id,
        word: w,
        ipa_uk: String(row.ipa || "").trim() || `/${single}/`,
        ipa_us: String(row.ipa || "").trim() || `/${single}/`,
        audio_uk: audioUs,
        audio_us: audioUs,
        part_of_speech: String(row.part_of_speech || "other"),
        part_of_speech_vi: posLabelVi(String(row.part_of_speech || "")),
        example_sentence: String(row.example_sentence || "").trim(),
        example_sentence_vi: String(row.example_sentence_vi || "").trim(),
        example_sentence_ipa: String(row.example_sentence_ipa || "").trim(),
        vietnamese_meaning: String(row.vietnamese_meaning || "").trim(),
        question_text:
          String(row.question_text || "").trim() || `What does "${w}" mean in Vietnamese?`,
        image_url: img,
        example_audio_url: normalizeMediaUrl(row.example_audio_url) || "",
      };
      return NextResponse.json({ success: true, data });
    }

    const api = await fetchFreeDictionaryEntry(single);
    if (!api) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy từ trong từ điển. Thử từ khác." },
        { status: 404 }
      );
    }

    const w = api.word;
    const vn =
      (await translateWordEnVi(w)) ||
      (api.definition_hint ? await translateWordEnVi(api.definition_hint.slice(0, 120)) : "");
    const exampleVi = api.example_sentence
      ? await translateWordEnVi(api.example_sentence)
      : "";

    const img = getMatchingImageByWord(w) || buildAiImageUrl(w, "dictionary");

    const data = {
      source: "dictionaryapi",
      id: null,
      word: w,
      ipa_uk: api.ipaUk,
      ipa_us: api.ipaUs,
      audio_uk: api.audioUk,
      audio_us: api.audioUs,
      part_of_speech: api.part_of_speech,
      part_of_speech_vi: posLabelVi(api.part_of_speech),
      example_sentence: api.example_sentence,
      example_sentence_vi: exampleVi,
      example_sentence_ipa: "",
      vietnamese_meaning: vn,
      question_text: `What does "${w}" mean in Vietnamese?`,
      image_url: img,
      example_audio_url: "",
    };

    return NextResponse.json({ success: true, data });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Lỗi tra cứu từ điển." },
      { status: 500 }
    );
  }
}
