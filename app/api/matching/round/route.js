import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { normalizeMediaUrl } from "@/lib/media-url";
import { getMatchingImageByWord } from "@/lib/matching-image-map";

function pickMatchingImage(word, dbUrl) {
  const mapped = getMatchingImageByWord(word);
  if (mapped) return mapped;
  return normalizeMediaUrl(dbUrl);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedSection = Number(searchParams.get("section") || 1);
    const sectionSize = 4;
    const maxSections = 100;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM vocabulary
       WHERE level = 'beginner'
         AND word IS NOT NULL
         AND TRIM(word) <> ''
         AND image_url IS NOT NULL
         AND TRIM(image_url) <> ''`
    );

    const totalItems = Number(countRows[0]?.total || 0);
    if (!totalItems) {
      return NextResponse.json({ success: false, message: "No matching data." }, { status: 404 });
    }

    const totalSections = Math.max(1, Math.min(maxSections, Math.ceil(totalItems / sectionSize)));
    const section = Math.min(Math.max(1, requestedSection), totalSections);
    const offset = (section - 1) * sectionSize;

    const [rows] = await pool.query(
      `SELECT id, word, ipa, example_sentence, image_url, audio_url
       FROM vocabulary
       WHERE level = 'beginner'
         AND word IS NOT NULL
         AND TRIM(word) <> ''
         AND image_url IS NOT NULL
         AND TRIM(image_url) <> ''
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [sectionSize, offset]
    );

    const normalized = rows.map((r) => ({
      ...r,
      image_url: pickMatchingImage(r.word, r.image_url),
      audio_url: normalizeMediaUrl(r.audio_url),
    }));

    return NextResponse.json({
      success: true,
      data: normalized,
      meta: {
        section,
        section_size: sectionSize,
        total_sections: totalSections,
        total_items: totalItems,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to create matching round." },
      { status: 500 }
    );
  }
}
