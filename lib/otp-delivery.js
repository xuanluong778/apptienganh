import twilio from "twilio";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { getSettingSync } from "@/lib/runtime-settings/cache";

function smsMessage(code) {
  return `Ma OTP cua ban la ${code}. Ma het han sau 10 phut.`;
}

function emailHtml(code) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Ma OTP xac thuc tai khoan</h2>
      <p>Ma OTP cua ban la:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:3px">${code}</p>
      <p>Ma co hieu luc trong 10 phut.</p>
    </div>
  `;
}

async function sendSmsTwilio(to, code) {
  const sid = getSettingSync("TWILIO_ACCOUNT_SID") || "";
  const token = getSettingSync("TWILIO_AUTH_TOKEN") || "";
  const from = getSettingSync("TWILIO_FROM_PHONE") || "";
  if (!sid || !token || !from) return false;
  const client = twilio(sid, token);
  await client.messages.create({
    from,
    to,
    body: smsMessage(code),
  });
  return true;
}

function smtpTlsOptions() {
  const raw = getSettingSync("SMTP_TLS_REJECT_UNAUTHORIZED");
  if (raw === "false" || raw === "0") {
    return { rejectUnauthorized: false };
  }
  return { minVersion: "TLSv1.2" };
}

async function sendEmailSmtp(to, code) {
  const host = getSettingSync("SMTP_HOST") || "";
  const port = Number(getSettingSync("SMTP_PORT") || 587) || 587;
  const user = getSettingSync("SMTP_USER") || "";
  const pass = getSettingSync("SMTP_PASSWORD") || "";
  const from = getSettingSync("SMTP_FROM") || user;
  if (!host || !user || !pass || !from) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
    tls: smtpTlsOptions(),
  });
  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Ma OTP xac thuc tai khoan",
      text: smsMessage(code),
      html: emailHtml(code),
    });
    return true;
  } catch (err) {
    console.error("[OTP][SMTP][register]", err?.message || err);
    return false;
  }
}

async function sendEmailSendgrid(to, code) {
  const apiKey = getSettingSync("SENDGRID_API_KEY") || "";
  const from = getSettingSync("SENDGRID_FROM_EMAIL") || "";
  if (!apiKey || !from) return false;
  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from,
      subject: "Ma OTP xac thuc tai khoan",
      text: smsMessage(code),
      html: emailHtml(code),
    });
    return true;
  } catch (err) {
    console.error("[OTP][SendGrid][register]", err?.message || err);
    return false;
  }
}

async function sendByWebhook(contactType, contactValue, code) {
  if (contactType === "email") {
    const webhook = getSettingSync("EMAIL_OTP_WEBHOOK_URL") || "";
    if (!webhook) return false;
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contactValue,
          subject: "Ma OTP xac thuc tai khoan",
          text: smsMessage(code),
        }),
      });
      if (!res.ok) {
        console.error("[OTP][webhook][email] HTTP", res.status);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[OTP][webhook][email]", err?.message || err);
      return false;
    }
  }

  const webhook = getSettingSync("SMS_OTP_WEBHOOK_URL") || "";
  if (!webhook) return false;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: contactValue,
      message: smsMessage(code),
    }),
  });
  return true;
}

async function sendEmailSmtpLogin(to, subject, text, html) {
  const host = getSettingSync("SMTP_HOST") || "";
  const port = Number(getSettingSync("SMTP_PORT") || 587) || 587;
  const user = getSettingSync("SMTP_USER") || "";
  const pass = getSettingSync("SMTP_PASSWORD") || "";
  const from = getSettingSync("SMTP_FROM") || user;
  if (!host || !user || !pass || !from) return false;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
    tls: smtpTlsOptions(),
  });
  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return true;
  } catch (err) {
    console.error("[OTP][SMTP][login]", err?.message || err);
    return false;
  }
}

/** Login / magic-link style OTP — English copy per product spec (SendGrid + Twilio). */
export async function sendLoginOtp({ type, to, code }) {
  const t = String(type || "").toLowerCase();
  if (t === "email") {
    const subject = "Your verification code";
    const text = `Your OTP code is: ${code}\nThis code will expire in 5 minutes.`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <p>Your OTP code is: <strong style="font-size:24px;letter-spacing:2px">${code}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      </div>`;
    const apiKey = getSettingSync("SENDGRID_API_KEY") || "";
    const from = getSettingSync("SENDGRID_FROM_EMAIL") || "";
    if (apiKey && from) {
      sgMail.setApiKey(apiKey);
      await sgMail.send({ to, from, subject, text, html });
      return true;
    }
    if (await sendEmailSmtpLogin(to, subject, text, html)) return true;
    console.log(`[OTP][LOGIN][EMAIL][FALLBACK] ${to}: ${code}`);
    return false;
  }

  const body = `Your OTP is ${code}. It expires in 5 minutes.`;
  const sid = getSettingSync("TWILIO_ACCOUNT_SID") || "";
  const token = getSettingSync("TWILIO_AUTH_TOKEN") || "";
  const fromPhone = getSettingSync("TWILIO_FROM_PHONE") || "";
  if (sid && token && fromPhone) {
    const client = twilio(sid, token);
    await client.messages.create({ from: fromPhone, to, body });
    return true;
  }
  console.log(`[OTP][LOGIN][SMS][FALLBACK] ${to}: ${code}`);
  return false;
}

/**
 * Gửi email OTP đăng ký (dùng trực tiếp hoặc qua worker hàng đợi).
 * @returns {Promise<boolean>} true nếu đã gửi qua SendGrid / SMTP / webhook.
 */
export async function deliverRegisterOtpEmail(contactValue, otpCode) {
  if (await sendEmailSendgrid(contactValue, otpCode)) return true;
  if (await sendEmailSmtp(contactValue, otpCode)) return true;
  if (await sendByWebhook("email", contactValue, otpCode)) return true;
  console.error(
    `[OTP][EMAIL] Không gửi được: thiếu SENDGRID_* / SMTP_* / EMAIL_OTP_WEBHOOK — ${contactValue}`
  );
  return false;
}

export async function sendOtp({ contactType, contactValue, otpCode }) {
  if (contactType === "email") {
    const ok = await deliverRegisterOtpEmail(contactValue, otpCode);
    if (!ok) {
      const err = new Error("REGISTER_EMAIL_OTP_FAILED");
      err.code = "REGISTER_EMAIL_OTP_FAILED";
      throw err;
    }
    return;
  }

  const smsTo =
    contactType === "phone" && /^\d+$/.test(String(contactValue)) && String(contactValue).startsWith("84")
      ? `+${contactValue}`
      : contactValue;
  if (await sendSmsTwilio(smsTo, otpCode)) return;
  if (await sendByWebhook("phone", contactValue, otpCode)) return;
  console.log(`[OTP][SMS][DEV_FALLBACK] ${contactValue}: ${otpCode}`);
}
