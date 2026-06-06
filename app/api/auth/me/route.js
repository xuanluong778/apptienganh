import { NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  ensureSubscriptionRow,
  fetchSubscriptionRow,
  getTrialDaysRemaining,
  getUserPlan,
} from "@/lib/subscriptions/subscription-service";
import { ensureUserProfileColumns } from "@/lib/users/ensure-user-profile-columns";
import { ensureUserSessionsTable } from "@/lib/auth/ensure-session-schema";

const COOKIE_NAME = "session_token";

export async function GET(request) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    await ensureUserSessionsTable();
    await ensureUserProfileColumns();

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.date_of_birth
       FROM user_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired." },
        { status: 401 }
      );
    }

    let trialPayload = null;
    let planState = "expired";
    try {
      await ensureSubscriptionRow(user.id);
      const sub = await fetchSubscriptionRow(user.id);
      planState = getUserPlan(sub);
      if (sub?.trial_end_at) {
        const end = sub.trial_end_at instanceof Date ? sub.trial_end_at : new Date(sub.trial_end_at);
        if (planState === "trial") {
          const days = getTrialDaysRemaining(sub);
          if (days != null) {
            trialPayload = {
              end_at: end.toISOString(),
              days_remaining: days,
              is_active: true,
            };
          }
        } else if (planState === "expired") {
          trialPayload = {
            end_at: end.toISOString(),
            days_remaining: 0,
            is_active: false,
          };
        }
      }
    } catch {
      /* optional enrichment */
    }

    return NextResponse.json({
      success: true,
      data: { ...user, plan: planState, trial: trialPayload },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch current user." },
      { status: 500 }
    );
  }
}
