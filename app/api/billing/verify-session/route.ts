import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getSessionUserIdFromRequest } from "@/lib/http/ai-entitlement";
import { getStripe, resolvePlanFromStripePriceId } from "@/lib/billing/stripe";
import { logPaymentSuccessOnce } from "@/lib/billing/conversion-tracking";
import { fetchSubscriptionRow, getUserPlan } from "@/lib/subscriptions/subscription-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function planFromSession(session: Stripe.Checkout.Session): "pro" | "vip" | null {
  const m = session.metadata?.plan;
  if (m === "pro" || m === "vip") return m;
  const sub = session.subscription;
  if (typeof sub === "object" && sub != null && "metadata" in sub) {
    const p = sub.metadata?.plan;
    if (p === "pro" || p === "vip") return p;
    const priceId = sub.items?.data?.[0]?.price?.id;
    return resolvePlanFromStripePriceId(priceId);
  }
  return null;
}

/**
 * GET /api/billing/verify-session?session_id=cs_...
 * Confirms the Checkout Session belongs to the current user and payment completed.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, code: "AUTH_REQUIRED", message: "Sign in required." },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "session_id is required." },
        { status: 400 }
      );
    }

    let stripe: ReturnType<typeof getStripe>;
    try {
      stripe = getStripe();
    } catch {
      return NextResponse.json({ success: false, message: "Stripe is not configured." }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const ownerOk =
      session.client_reference_id === String(userId) ||
      session.metadata?.userId === String(userId);
    if (!ownerOk) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "This checkout does not belong to your account." },
        { status: 403 }
      );
    }

    if (session.mode !== "subscription") {
      return NextResponse.json({ success: false, message: "Invalid checkout mode." }, { status: 400 });
    }

    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      session.status === "complete";

    const plan = planFromSession(session);

    let appPlan: "pro" | "vip" | "trial" | "expired" | null = null;
    try {
      const row = await fetchSubscriptionRow(userId);
      appPlan = getUserPlan(row);
    } catch {
      /* ignore */
    }

    if (paid) {
      await logPaymentSuccessOnce({
        userId,
        stripeCheckoutSessionId: sessionId,
        metadata: {
          plan,
          payment_status: session.payment_status,
          app_plan: appPlan,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        plan,
        payment_status: session.payment_status,
        session_status: session.status,
        paid,
        app_plan: appPlan,
      },
    });
  } catch (err) {
    console.error("[billing/verify-session]", err);
    return NextResponse.json(
      { success: false, message: "Could not verify checkout session." },
      { status: 500 }
    );
  }
}
