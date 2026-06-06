import { NextResponse } from "next/server";
import { translateDefinitionToVi } from "@/lib/dictionary/meaning-vi";

/** Dịch nghĩa từ EN→VI (MyMemory) — không cần đăng nhập. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = String(searchParams.get("word") || searchParams.get("q") || "").trim();
    const def = String(searchParams.get("def") || "").trim();
    if (word.length < 2) {
      return NextResponse.json(
        { success: false, message: "word is required (min 2 chars)." },
        { status: 400 }
      );
    }
    const meaningVi = await translateDefinitionToVi(word, def);
    return NextResponse.json({ success: true, data: { meaningVi: meaningVi || "" } });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Không dịch được lúc này." },
      { status: 500 }
    );
  }
}
