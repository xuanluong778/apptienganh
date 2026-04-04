import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/process-stripe-event";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEvent,
} from "@/lib/subscriptions/subscription-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — verify signature, dedupe events, sync subscription / downgrades.
 * Configure endpoint in Stripe Dashboard with the same signing secret as STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, getStripeWebhookSecret());
  } catch (err) {
    console.error("[stripe] webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claimed = await claimStripeWebhookEvent(event.id, event.type);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[stripe] webhook handler error", event.type, err);
    await releaseStripeWebhookEvent(event.id);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
