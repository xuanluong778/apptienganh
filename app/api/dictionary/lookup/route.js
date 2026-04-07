import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập từ cần tra cứu (ít nhất 2 ký tự)." },
        { status: 400 }
      );
    }

    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy từ "${q}".`,
        },
        { status: 404 }
      );
    }

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first || typeof first !== "object") {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy từ "${q}".` },
        { status: 404 }
      );
    }

    const meanings = Array.isArray(first.meanings) ? first.meanings : [];
    const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];
    const firstMeaning = meanings[0] || {};
    const firstDef = Array.isArray(firstMeaning.definitions) ? firstMeaning.definitions[0] : null;
    const firstPhoneticText =
      phonetics.find((p) => p && typeof p.text === "string" && p.text.trim())?.text || "";
    const firstAudio =
      phonetics.find((p) => p && typeof p.audio === "string" && p.audio.trim())?.audio || "";

    return NextResponse.json({
      success: true,
      data: {
        word: String(first.word || q),
        phonetic: String(firstPhoneticText || ""),
        audio: String(firstAudio || ""),
        partOfSpeech: String(firstMeaning.partOfSpeech || ""),
        definition: String(firstDef?.definition || ""),
        example: String(firstDef?.example || ""),
        sourceUrl: Array.isArray(first.sourceUrls) ? String(first.sourceUrls[0] || "") : "",
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Không tra cứu được từ điển lúc này. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
