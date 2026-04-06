import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateOtpCode, generateOtpToken, hashOtpCode } from "@/lib/auth";
import { sendOtp } from "@/lib/otp-delivery";
import { getSettingSync } from "@/lib/runtime-settings/cache";
import { normalizePhoneForStorage } from "@/lib/phone-vn";

function normalizeContact(type, value) {
  const t = String(type || "").toLowerCase();
  if (t === "email") {
    return { contactType: "email", contactValue: String(value || "").trim().toLowerCase() };
  }
  if (t === "phone") {
    const phoneStored = normalizePhoneForStorage(value) || String(value || "").replace(/[^\d+]/g, "").trim();
    return { contactType: "phone", contactValue: phoneStored };
  }
  return { contactType: "", contactValue: "" };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const normalized = normalizeContact(body.contact_type, body.contact_value);
    const { contactType, contactValue } = normalized;

    if (!contactType || !contactValue) {
      return NextResponse.json(
        { success: false, message: "contact_type and contact_value are required." },
        { status: 400 }
      );
    }

    if (contactType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
      return NextResponse.json({ success: false, message: "Invalid email format." }, { status: 400 });
    }
    if (contactType === "phone" && contactValue.replace(/\D/g, "").length < 9) {
      return NextResponse.json({ success: false, message: "Invalid phone number." }, { status: 400 });
    }

    await pool.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL UNIQUE AFTER email");
    await pool.query(
      `CREATE TABLE IF NOT EXISTS verification_codes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        otp_token VARCHAR(100) NOT NULL UNIQUE,
        contact_type VARCHAR(20) NOT NULL,
        contact_value VARCHAR(255) NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        purpose VARCHAR(30) NOT NULL DEFAULT 'register',
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contact (contact_type, contact_value),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [existing] = await pool.query(
      contactType === "email"
        ? "SELECT id FROM users WHERE email = ? LIMIT 1"
        : "SELECT id FROM users WHERE phone = ? LIMIT 1",
      [contactValue]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `${contactType === "email" ? "Email" : "Số điện thoại"} đã tồn tại.` },
        { status: 409 }
      );
    }

    const [recent] = await pool.query(
      `SELECT id, created_at
       FROM verification_codes
       WHERE contact_type = ? AND contact_value = ? AND purpose = 'register'
       ORDER BY id DESC
       LIMIT 1`,
      [contactType, contactValue]
    );
    const createdAt = recent[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
    if (createdAt && Date.now() - createdAt < 45000) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chờ 45 giây trước khi gửi lại OTP." },
        { status: 429 }
      );
    }

    const otpCode = generateOtpCode();
    const otpToken = generateOtpToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO verification_codes
        (otp_token, contact_type, contact_value, code_hash, purpose, expires_at)
       VALUES (?, ?, ?, ?, 'register', ?)`,
      [otpToken, contactType, contactValue, hashOtpCode(otpCode), expiresAt]
    );

    let queued = false;
    if (contactType === "email") {
      const { tryEnqueueRegisterOtpEmail } = await import("@/lib/otp-queue/otp-register-mail");
      queued = await tryEnqueueRegisterOtpEmail(contactValue, otpCode);
    }
    if (!queued) {
      await sendOtp({ contactType, contactValue, otpCode });
    }

    const allowDebugOtp =
      process.env.NODE_ENV !== "production" && getSettingSync("AUTH_SHOW_DEBUG_OTP") === "true";

    const message =
      contactType === "email" && queued
        ? "Đã tiếp nhận. Mã OTP đang được gửi đến email (thường trong vài giây)."
        : `Đã gửi OTP đến ${contactType === "email" ? "email" : "số điện thoại"}.`;

    return NextResponse.json({
      success: true,
      message,
      data: {
        otp_token: otpToken,
        debug_otp: allowDebugOtp ? otpCode : undefined,
        email_delivery: contactType === "email" ? (queued ? "queued" : "sync") : undefined,
      },
    });
  } catch (_error) {
    return NextResponse.json({ success: false, message: "Failed to send OTP." }, { status: 500 });
  }
}
