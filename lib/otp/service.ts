import crypto from "crypto";
import pool from "@/lib/db";
import { ensureUsersAuthColumns } from "@/lib/auth/ensure-verification-schema";
import { hashOtpCode, verifyOtpCode, hashPassword } from "@/lib/auth";
import { sendLoginOtp } from "@/lib/otp-delivery";
import { ensureOtpCodesTable } from "./ensure-table";
import { createInitialSubscriptionForNewUser } from "@/lib/subscriptions/subscription-service";

const SEND_WINDOW_MINUTES = 5;
const MAX_SENDS_IN_WINDOW = 3;
const OTP_EXPIRES_MINUTES = 5;
export const MAX_OTP_GUESSES = 5;

async function ensureUserSchemaPatches(): Promise<void> {
  await ensureUsersAuthColumns(pool);
}

function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(s: string): string | null {
  const e = s.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function normalizePhone(s: string): string | null {
  const p = s.replace(/[^\d+]/g, "").trim();
  if (p.replace(/\D/g, "").length < 9) return null;
  return p;
}

export type SendOtpBody = { email?: string; phone?: string; type: string };

export async function sendAuthOtp(body: SendOtpBody): Promise<
  { ok: true } | { ok: false; status: number; message: string }
> {
  await ensureOtpCodesTable();
  await ensureUserSchemaPatches();

  const kind = String(body.type || "").toLowerCase();
  if (kind !== "email" && kind !== "sms") {
    return { ok: false, status: 400, message: 'type must be "email" or "sms".' };
  }

  let email: string | null = null;
  let phone: string | null = null;

  if (kind === "email") {
    const e = normalizeEmail(String(body.email ?? ""));
    if (!e) {
      return { ok: false, status: 400, message: "email is required when type is email." };
    }
    email = e;
  } else {
    const p = normalizePhone(String(body.phone ?? ""));
    if (!p) {
      return { ok: false, status: 400, message: "phone is required when type is sms." };
    }
    phone = p;
  }

  const [countRows] = await pool.query(
    kind === "email"
      ? `SELECT COUNT(*) AS c FROM otp_codes
         WHERE type = 'email' AND email = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`
      : `SELECT COUNT(*) AS c FROM otp_codes
         WHERE type = 'sms' AND phone = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    kind === "email" ? [email, SEND_WINDOW_MINUTES] : [phone, SEND_WINDOW_MINUTES]
  );
  const recentSends = Number((countRows as { c: number }[])[0]?.c ?? 0);
  if (recentSends >= MAX_SENDS_IN_WINDOW) {
    return {
      ok: false,
      status: 429,
      message: "Too many OTP requests. Please wait a few minutes and try again.",
    };
  }

  await pool.query(
    kind === "email"
      ? `UPDATE otp_codes SET used = 1, updated_at = NOW()
         WHERE type = 'email' AND email = ? AND used = 0`
      : `UPDATE otp_codes SET used = 1, updated_at = NOW()
         WHERE type = 'sms' AND phone = ? AND used = 0`,
    kind === "email" ? [email] : [phone]
  );

  const code = generateSixDigitOtp();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  const [insertRes] = await pool.query(
    `INSERT INTO otp_codes (user_id, email, phone, code, type, expires_at, used, failed_attempts)
     VALUES (NULL, ?, ?, ?, ?, ?, 0, 0)`,
    [email, phone, codeHash, kind, expiresAt]
  );
  const insertId = Number((insertRes as { insertId?: number }).insertId);

  const deliveryType = kind === "email" ? "email" : "sms";
  const to = (kind === "email" ? email : phone) as string;

  try {
    const delivered = await sendLoginOtp({ type: deliveryType, to, code });
    if (!delivered && process.env.NODE_ENV === "production") {
      await pool.query(`DELETE FROM otp_codes WHERE id = ?`, [insertId]);
      return {
        ok: false,
        status: 503,
        message: "Could not send OTP. Check SendGrid / Twilio configuration.",
      };
    }
  } catch (err) {
    console.error("[otp] delivery failed", err);
    await pool.query(`DELETE FROM otp_codes WHERE id = ?`, [insertId]);
    return { ok: false, status: 503, message: "OTP delivery failed." };
  }

  return { ok: true };
}

export type VerifyOtpBody = { email?: string; phone?: string; code: string };

export async function verifyAuthOtp(
  body: VerifyOtpBody
): Promise<{ ok: true; userId: number; isNewUser: boolean } | { ok: false; status: number; message: string }> {
  await ensureOtpCodesTable();
  await ensureUserSchemaPatches();

  const rawCode = String(body.code ?? "").trim();
  if (!/^\d{6}$/.test(rawCode)) {
    return { ok: false, status: 400, message: "code must be a 6-digit number." };
  }

  const hasEmail = String(body.email ?? "").trim().length > 0;
  const hasPhone = String(body.phone ?? "").trim().length > 0;
  if (hasEmail && hasPhone) {
    return { ok: false, status: 400, message: "Provide either email or phone, not both." };
  }
  if (!hasEmail && !hasPhone) {
    return { ok: false, status: 400, message: "email or phone is required." };
  }

  let email: string | null = null;
  let phone: string | null = null;
  let kind: "email" | "sms";

  if (hasEmail) {
    const e = normalizeEmail(String(body.email));
    if (!e) return { ok: false, status: 400, message: "Invalid email." };
    email = e;
    kind = "email";
  } else {
    const p = normalizePhone(String(body.phone));
    if (!p) return { ok: false, status: 400, message: "Invalid phone." };
    phone = p;
    kind = "sms";
  }

  const conn = await pool.getConnection();
  let isNewUser = false;
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      kind === "email"
        ? `SELECT id, code, failed_attempts FROM otp_codes
           WHERE type = 'email' AND email = ?
           AND used = 0 AND expires_at > NOW()
           ORDER BY id DESC
           LIMIT 1
           FOR UPDATE`
        : `SELECT id, code, failed_attempts FROM otp_codes
           WHERE type = 'sms' AND phone = ?
           AND used = 0 AND expires_at > NOW()
           ORDER BY id DESC
           LIMIT 1
           FOR UPDATE`,
      kind === "email" ? [email] : [phone]
    );

    const row = (rows as { id: number; code: string; failed_attempts: number }[])[0];
    if (!row) {
      await conn.rollback();
      return { ok: false, status: 400, message: "Invalid or expired code." };
    }

    if (Number(row.failed_attempts) >= MAX_OTP_GUESSES) {
      await conn.rollback();
      return { ok: false, status: 429, message: "Too many failed attempts. Request a new code." };
    }

    if (!verifyOtpCode(rawCode, row.code)) {
      await conn.query(
        `UPDATE otp_codes SET failed_attempts = failed_attempts + 1, updated_at = NOW() WHERE id = ?`,
        [row.id]
      );
      await conn.commit();
      return { ok: false, status: 400, message: "Invalid code." };
    }

    await conn.query(`UPDATE otp_codes SET used = 1, updated_at = NOW() WHERE id = ?`, [row.id]);

    let userId: number;

    if (kind === "email") {
      const [urows] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
      const existing = (urows as { id: number }[])[0];
      if (existing) {
        userId = Number(existing.id);
      } else {
        isNewUser = true;
        const name = (email as string).split("@")[0] || "User";
        const passwordHash = hashPassword(crypto.randomBytes(32).toString("hex"));
        const [ins] = await conn.query(
          "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, NULL, ?)",
          [name, email, passwordHash]
        );
        userId = Number((ins as { insertId: number }).insertId);
      }
    } else {
      const [urows] = await conn.query("SELECT id FROM users WHERE phone = ? LIMIT 1", [phone]);
      const existing = (urows as { id: number }[])[0];
      if (existing) {
        userId = Number(existing.id);
      } else {
        isNewUser = true;
        const digits = (phone as string).replace(/\D/g, "");
        const name = `User ${digits.slice(-4).padStart(4, "0")}`;
        const passwordHash = hashPassword(crypto.randomBytes(32).toString("hex"));
        const [ins] = await conn.query(
          "INSERT INTO users (name, email, phone, password_hash) VALUES (?, NULL, ?, ?)",
          [name, phone, passwordHash]
        );
        userId = Number((ins as { insertId: number }).insertId);
      }
    }

    await conn.query(`UPDATE otp_codes SET user_id = ? WHERE id = ?`, [userId, row.id]);

    await conn.commit();
    return { ok: true, userId, isNewUser };
  } catch (err: unknown) {
    await conn.rollback();
    const code = (err as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      return { ok: false, status: 409, message: "Account already exists with this contact." };
    }
    throw err;
  } finally {
    conn.release();
  }
}

export async function ensureSubscriptionAfterOtpRegister(userId: number, isNewUser: boolean): Promise<void> {
  if (!isNewUser) return;
  try {
    await createInitialSubscriptionForNewUser(userId);
  } catch {
    /* non-fatal */
  }
}
