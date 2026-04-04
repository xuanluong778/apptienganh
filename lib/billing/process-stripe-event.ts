import type Stripe from "stripe";
import {
  applyStripePaidPlan,
  downgradeAfterStripeSubscriptionEnded,
  findUserIdByStripeSubscriptionId,
} from "@/lib/subscriptions/subscription-service";
import { getStripe, resolvePlanFromStripePriceId } from "./stripe";

function firstPriceId(sub: Stripe.Subscription): string | undefined {
  return sub.items.data[0]?.price?.id;
}

function resolveUserId(sub: Stripe.Subscription): number | null {
  const raw = sub.metadata?.userId;
  const n = raw != null ? Number.parseInt(String(raw), 10) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function resolvePlan(sub: Stripe.Subscription): "pro" | "vip" | null {
  const meta = sub.metadata?.plan;
  if (meta === "pro" || meta === "vip") return meta;
  return resolvePlanFromStripePriceId(firstPriceId(sub));
}

/**
 * Upsert paid access from a Stripe Subscription object (checkout, renewals, manual sync).
 */
export async function syncSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  let userId = resolveUserId(sub);
  if (userId == null) {
    userId = await findUserIdByStripeSubscriptionId(sub.id);
  }
  if (userId == null) {
    console.error("[stripe] syncSubscriptionFromStripe: missing userId", sub.id);
    return;
  }

  const plan = resolvePlan(sub);
  if (plan == null) {
    console.error("[stripe] syncSubscriptionFromStripe: unknown plan", sub.id, firstPriceId(sub));
    return;
  }

  const customerRaw = sub.customer;
  const stripeCustomerId =
    typeof customerRaw === "string" ? customerRaw : customerRaw?.deleted ? null : customerRaw?.id ?? null;

  const periodEnd = new Date(sub.current_period_end * 1000);

  await applyStripePaidPlan({
    userId,
    plan,
    periodEnd,
    stripeCustomerId,
    stripeSubscriptionId: sub.id,
  });
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return;
      const subRef = session.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId);
      await syncSubscriptionFromStripe(sub);
      return;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.subscription;
      if (!subRef || typeof subRef !== "string") return;
      const sub = await stripe.subscriptions.retrieve(subRef);
      await syncSubscriptionFromStripe(sub);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      let userId = resolveUserId(sub);
      if (userId == null) {
        userId = await findUserIdByStripeSubscriptionId(sub.id);
      }
      if (userId != null) {
        await downgradeAfterStripeSubscriptionEnded(userId);
      }
      return;
    }
    default:
      return;
  }
}
