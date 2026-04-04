import { NextResponse } from "next/server";
import { translateEnglishToVietnameseWithFallback } from "@/lib/ai";
import { assertTranslateAllowed, recordPooledAiUsageSuccess } from "@/lib/http/api-guards";
import { getSettingSync } from "@/lib/runtime-settings/cache";

export const runtime = "nodejs";

const MAX_CHARS = 3500;

export async function POST(request) {
  try {
    const allowed = await assertTranslateAllowed(request);
    if (!allowed.ok) {
      return NextResponse.json(
        { success: false, code: allowed.code, message: allowed.reason || "Translation not allowed." },
        { status: allowed.status ?? 402 }
      );
    }

    const body = await request.json();
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ success: false, message: "text is required." }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { success: false, message: `Text too long (max ${MAX_CHARS} characters).` },
        { status: 400 }
      );
    }

    const hasOpenAi = Boolean(getSettingSync("OPENAI_API_KEY"));
    if (!hasOpenAi && text.length > 480) {
      return NextResponse.json(
        {
          success: false,
          message: "Đoạn quá dài để dịch miễn phí. Thêm OPENAI_API_KEY hoặc thu ngắn đoạn chữ.",
        },
        { status: 400 }
      );
    }

    const translated = await translateEnglishToVietnameseWithFallback(text);

    if (!translated) {
      return NextResponse.json(
        { success: false, message: "Translation failed. Try again later." },
        { status: 502 }
      );
    }

    await recordPooledAiUsageSuccess(allowed.entitlement.userId, allowed.entitlement);

    return NextResponse.json({ success: true, data: { translated } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error?.message || "Translation error." },
      { status: 500 }
    );
  }
}
