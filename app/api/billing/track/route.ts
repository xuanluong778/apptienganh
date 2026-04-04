import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { isClientBillableEvent, logBillingConversionEvent } from "@/lib/billing/conversion-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  event?: string;
  metadata?: Record<string, unknown>;
  plan?: string;
};

/**
 * POST /api/billing/track
 * Client-only funnel steps: paywall_shown, upgrade_clicked (requires session).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in required." },
        { status: 401 }
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
    }

    const event = String(body.event || "").trim();
    if (!isClientBillableEvent(event)) {
      return NextResponse.json({ success: false, message: "Invalid event." }, { status: 400 });
    }

    const metadata: Record<string, unknown> = {
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
    };
    if (body.plan) metadata.plan = String(body.plan);

    await logBillingConversionEvent({
      userId,
      event,
      metadata: Object.keys(metadata).length ? metadata : null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[billing/track]", err);
    return NextResponse.json({ success: false, message: "Track failed." }, { status: 500 });
  }
}
