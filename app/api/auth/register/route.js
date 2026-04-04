import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { hashPassword, verifyOtpCode } from "@/lib/auth";
import { setSessionOnResponse } from "@/lib/auth/create-session";
import { createInitialSubscriptionForNewUser } from "@/lib/subscriptions/subscription-service";

function normalizeContact(type, value, fallbackEmail) {
  const t = String(type || "").toLowerCase();
  if (t === "phone") {
    return {
      contactType: "phone",
      contactValue: String(value || "").replace(/[^\d+]/g, "").trim(),
      email: null,
      phone: String(value || "").replace(/[^\d+]/g, "").trim(),
    };
  }
  const emailValue = String(value || fallbackEmail || "").trim().toLowerCase();
  return {
    contactType: "email",
    contactValue: emailValue,
    email: emailValue,
    phone: null,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const emailFallback = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const otpToken = typeof body.otp_token === "string" ? body.otp_token.trim() : "";
    const otpCode = typeof body.otp_code === "string" ? body.otp_code.trim() : "";
    const normalized = normalizeContact(body.contact_type, body.contact_value, emailFallback);
    const { contactType, contactValue, email, phone } = normalized;

    if (!name || !contactValue || !password || !otpToken || !otpCode) {
      return NextResponse.json(
        { success: false, message: "name, password, contact, otp_token, otp_code are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (contactType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
      return NextResponse.json({ success: false, message: "Email không hợp lệ." }, { status: 400 });
    }
    if (contactType === "phone" && contactValue.replace(/\D/g, "").length < 9) {
      return NextResponse.json({ success: false, message: "Số điện thoại không hợp lệ." }, { status: 400 });
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
        {
          success: false,
          message: `${contactType === "email" ? "Email" : "Số điện thoại"} đã được đăng ký.`,
        },
        { status: 409 }
      );
    }

    const [otpRows] = await pool.query(
      `SELECT id, code_hash, expires_at, consumed_at, attempts
       FROM verification_codes
       WHERE otp_token = ? AND contact_type = ? AND contact_value = ? AND purpose = 'register'
       LIMIT 1`,
      [otpToken, contactType, contactValue]
    );
    const otp = otpRows[0];
    if (!otp) {
      return NextResponse.json({ success: false, message: "OTP token không hợp lệ." }, { status: 400 });
    }
    if (otp.consumed_at) {
      return NextResponse.json({ success: false, message: "OTP đã được sử dụng." }, { status: 400 });
    }
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: "OTP đã hết hạn." }, { status: 400 });
    }
    if (Number(otp.attempts || 0) >= 5) {
      return NextResponse.json(
        { success: false, message: "OTP sai quá nhiều lần. Vui lòng yêu cầu mã mới." },
        { status: 429 }
      );
    }
    if (!verifyOtpCode(otpCode, otp.code_hash)) {
      await pool.query("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?", [otp.id]);
      return NextResponse.json({ success: false, message: "OTP không đúng." }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
      [name, email, phone, passwordHash]
    );
    const newUserId = Number(result.insertId);
    if (Number.isFinite(newUserId) && newUserId > 0) {
      try {
        await createInitialSubscriptionForNewUser(newUserId);
      } catch {
        /* non-fatal; row can be created lazily on first AI call */
      }
    }
    await pool.query("UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?", [otp.id]);

    const res = NextResponse.json(
      {
        success: true,
        message: "Đăng ký thành công. Bạn đã được đăng nhập.",
        data: {
          id: result.insertId,
          name,
          email,
          phone,
        },
      },
      { status: 201 }
    );

    if (Number.isFinite(newUserId) && newUserId > 0) {
      await setSessionOnResponse(res, newUserId);
    }

    return res;
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Failed to register user." },
      { status: 500 }
    );
  }
}
