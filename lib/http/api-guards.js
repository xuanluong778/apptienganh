/**
 * API-route guards: subscription paywall, daily AI quotas, optional rate hints.
 */

import {
  assertAiFeatureAccess,
  getSessionUserIdFromRequest,
  recordPooledAiUsageSuccess,
} from "./ai-entitlement";

export { assertAiFeatureAccess, getSessionUserIdFromRequest, recordPooledAiUsageSuccess };

/**
 * Lessons AI chat — requires logged-in user with active trial or paid plan and pooled quota.
 * @param { { id?: number } | null } user
 */
export async function assertLessonsChatAllowed(user) {
  if (!user?.id) {
    return {
      ok: false,
      reason: "Sign in to use AI chat.",
      code: "AUTH_REQUIRED",
      status: 401,
    };
  }
  const gate = await assertAiFeatureAccess(user.id, "chat");
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.message,
      code: gate.code,
      status: gate.status,
    };
  }
  return { ok: true, reason: null, code: undefined, entitlement: gate.billing };
}

/** Burst / legacy hook — daily limits live in `assertAiFeatureAccess`. */
export async function assertLessonsChatRateLimit(/* user */ _user) {
  return { ok: true, reason: null };
}

/** Translate — same entitlement as chat (pooled). */
export async function assertTranslateAllowed(request) {
  const userId = await getSessionUserIdFromRequest(request);
  if (!userId) {
    return {
      ok: false,
      reason: "Sign in to translate with AI.",
      code: "AUTH_REQUIRED",
      status: 401,
    };
  }
  const gate = await assertAiFeatureAccess(userId, "translate");
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.message,
      code: gate.code,
      status: gate.status,
    };
  }
  return { ok: true, reason: null, entitlement: gate.billing };
}

export async function assertTranslateRateLimit(/* request */ _request) {
  return { ok: true, reason: null };
}

/** Grammar AI routes — pooled with chat/translate. */
export async function assertGrammarAllowed(request) {
  const userId = await getSessionUserIdFromRequest(request);
  if (!userId) {
    return {
      ok: false,
      reason: "Sign in to use grammar assistance.",
      code: "AUTH_REQUIRED",
      status: 401,
    };
  }
  const gate = await assertAiFeatureAccess(userId, "grammar");
  if (!gate.ok) {
    return { ok: false, reason: gate.message, code: gate.code, status: gate.status };
  }
  return { ok: true, reason: null, entitlement: gate.billing };
}

/** Azure / speaking — VIP paid only. */
export async function assertSpeakingAllowed(request) {
  const userId = await getSessionUserIdFromRequest(request);
  if (!userId) {
    return {
      ok: false,
      reason: "Sign in to use pronunciation practice.",
      code: "AUTH_REQUIRED",
      status: 401,
    };
  }
  const gate = await assertAiFeatureAccess(userId, "speaking");
  if (!gate.ok) {
    return { ok: false, reason: gate.message, code: gate.code, status: gate.status };
  }
  return { ok: true, reason: null, entitlement: gate.billing };
}
