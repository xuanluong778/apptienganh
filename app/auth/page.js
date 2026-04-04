"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyAuthChanged } from "@/hooks/useAuthLoggedIn";

/** Đích nội bộ sau đăng nhập; không cho redirect về /auth để tránh vòng lặp. */
function safeNextDestination(raw) {
  if (!raw || typeof raw !== "string") return "/";
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  if (p.includes("..") || p.includes("\\")) return "/";
  if (p === "/auth" || p.startsWith("/auth?") || p.startsWith("/auth/")) return "/";
  return p;
}

export default function AuthPage() {
  const router = useRouter();
  const [registerForm, setRegisterForm] = useState({
    name: "",
    contactType: "email",
    contactValue: "",
    password: "",
    otpToken: "",
    otpCode: "",
  });
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [otpLogin, setOtpLogin] = useState({
    channel: "email",
    contact: "",
    code: "",
  });
  const [message, setMessage] = useState("");
  const [registerContactError, setRegisterContactError] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  async function fetchMe() {
    const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json();
    if (response.ok && result.success) {
      setCurrentUser(result.data);
    } else {
      setCurrentUser(null);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const dest = safeNextDestination(sp.get("next") || "/") || "/";
    router.replace(dest);
  }, [currentUser, router]);

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterContactError("");
    if (!registerForm.otpToken) {
      setRegisterContactError("Vui lòng gửi OTP trước khi tạo tài khoản.");
      return;
    }
    setMessage("Registering...");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: registerForm.name,
        password: registerForm.password,
        contact_type: registerForm.contactType,
        contact_value: registerForm.contactValue,
        otp_token: registerForm.otpToken,
        otp_code: registerForm.otpCode,
      }),
    });
    const result = await response.json();
    setMessage(result.message || "Done");
    if (response.status === 409) {
      setRegisterContactError("Thông tin liên hệ đã tồn tại. Vui lòng dùng thông tin khác.");
      return;
    }
    if (response.ok) {
      await fetchMe();
      notifyAuthChanged();
      setRegisterForm({
        name: "",
        contactType: "email",
        contactValue: "",
        password: "",
        otpToken: "",
        otpCode: "",
      });
      setDebugOtp("");
    }
  }

  async function handleRequestOtp() {
    setRegisterContactError("");
    setMessage("Đang gửi OTP...");
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_type: registerForm.contactType,
        contact_value: registerForm.contactValue,
      }),
    });
    const result = await response.json();
    setMessage(result.message || "Done");
    if (!response.ok) {
      setRegisterContactError(result.message || "Không gửi được OTP.");
      return;
    }
    setRegisterForm((p) => ({ ...p, otpToken: result.data?.otp_token || "" }));
    setDebugOtp(result.data?.debug_otp || "");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("Logging in...");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
    });
    const result = await response.json();
    setMessage(result.message || "Done");
    if (response.ok) {
      setLoginForm({ identifier: "", password: "" });
      await fetchMe();
      notifyAuthChanged();
    }
  }

  async function handleSendOtpLogin() {
    setRegisterContactError("");
    setMessage("Đang gửi mã OTP...");
    const type = otpLogin.channel === "email" ? "email" : "sms";
    const payload =
      type === "email"
        ? { type, email: otpLogin.contact.trim() }
        : { type, phone: otpLogin.contact.trim() };
    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setMessage(result.message || (response.ok ? "Đã gửi OTP." : "Lỗi"));
    if (!response.ok) {
      setRegisterContactError(result.message || "Không gửi được OTP.");
    }
  }

  async function handleVerifyOtpLogin(e) {
    e.preventDefault();
    setRegisterContactError("");
    setMessage("Đang xác thực...");
    const type = otpLogin.channel === "email" ? "email" : "sms";
    const payload =
      type === "email"
        ? { code: otpLogin.code.trim(), email: otpLogin.contact.trim() }
        : { code: otpLogin.code.trim(), phone: otpLogin.contact.trim() };
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setMessage(result.message || (response.ok ? "Đăng nhập thành công." : "Lỗi"));
    if (response.ok) {
      setOtpLogin((p) => ({ ...p, code: "" }));
      await fetchMe();
      notifyAuthChanged();
    } else {
      setRegisterContactError(result.message || "Mã không đúng hoặc đã hết hạn.");
    }
  }

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const result = await response.json();
    setMessage(result.message || "Done");
    if (response.ok) {
      setCurrentUser(null);
      notifyAuthChanged();
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Simple Auth</h1>
        <p className="status">
          {currentUser
            ? `Logged in as ${currentUser.name} (${currentUser.email || currentUser.phone || ""})`
            : "Not logged in"}
        </p>
        {message && <p className="message">{message}</p>}

        <div className="grid">
          <form onSubmit={handleVerifyOtpLogin} className="form">
            <h2>Đăng nhập OTP</h2>
            <p className="formHint">Email hoặc SĐT — nhận mã 6 số (hết hạn 5 phút).</p>
            <select
              value={otpLogin.channel}
              onChange={(e) =>
                setOtpLogin((p) => ({
                  ...p,
                  channel: e.target.value,
                  contact: "",
                  code: "",
                }))
              }
            >
              <option value="email">Email</option>
              <option value="phone">SMS (số điện thoại)</option>
            </select>
            <input
              type={otpLogin.channel === "email" ? "email" : "tel"}
              placeholder={otpLogin.channel === "email" ? "Email" : "Số điện thoại"}
              value={otpLogin.contact}
              onChange={(e) => setOtpLogin((p) => ({ ...p, contact: e.target.value }))}
              className={registerContactError ? "inputError" : ""}
              required
            />
            <button type="button" onClick={handleSendOtpLogin}>
              Gửi OTP
            </button>
            <input
              placeholder="Mã OTP (6 số)"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpLogin.code}
              onChange={(e) => setOtpLogin((p) => ({ ...p, code: e.target.value.replace(/\D/g, "") }))}
              required
            />
            {registerContactError ? <p className="fieldError">{registerContactError}</p> : null}
            <button type="submit">Xác thực &amp; đăng nhập</button>
          </form>

          <form onSubmit={handleRegister} className="form">
            <h2>Register</h2>
            <input
              placeholder="Name"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <select
              value={registerForm.contactType}
              onChange={(e) =>
                setRegisterForm((p) => ({
                  ...p,
                  contactType: e.target.value,
                  contactValue: "",
                  otpToken: "",
                  otpCode: "",
                }))
              }
            >
              <option value="email">Đăng ký bằng Gmail</option>
              <option value="phone">Đăng ký bằng Số điện thoại</option>
            </select>
            <input
              type={registerForm.contactType === "email" ? "email" : "text"}
              placeholder={registerForm.contactType === "email" ? "Gmail" : "Số điện thoại"}
              value={registerForm.contactValue}
              onChange={(e) => {
                setRegisterForm((p) => ({ ...p, contactValue: e.target.value }));
                if (registerContactError) {
                  setRegisterContactError("");
                }
              }}
              className={registerContactError ? "inputError" : ""}
              required
            />
            {registerContactError ? <p className="fieldError">{registerContactError}</p> : null}
            <button type="button" onClick={handleRequestOtp}>
              Gửi OTP xác thực
            </button>
            <input
              placeholder="Mã OTP"
              value={registerForm.otpCode}
              onChange={(e) => setRegisterForm((p) => ({ ...p, otpCode: e.target.value }))}
              required
            />
            {debugOtp ? <p className="fieldError">DEV OTP: {debugOtp}</p> : null}
            <input
              type="password"
              placeholder="Password (min 6)"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
            />
            <button type="submit">Create Account</button>
          </form>

          <form onSubmit={handleLogin} className="form">
            <h2>Login</h2>
            <input
              placeholder="Email hoặc số điện thoại"
              value={loginForm.identifier}
              onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button type="submit">Login</button>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </form>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%);
          font-family: "Fredoka", sans-serif;
        }
        .card {
          width: min(900px, 96vw);
          background: #fff;
          border-radius: 22px;
          padding: 1rem;
          border: 4px solid #fff;
          box-shadow: 0 14px 0 rgba(35, 51, 104, 0.16);
        }
        h1 {
          margin: 0 0 0.35rem;
          text-align: center;
          color: #2e4f88;
          font-size: 2rem;
        }
        .status,
        .message {
          text-align: center;
          margin: 0.3rem 0;
          color: #4b66a0;
          font-weight: 600;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 0.8rem;
          margin-top: 0.6rem;
        }
        .form {
          background: #f7fbff;
          border: 2px dashed #c9d8ff;
          border-radius: 16px;
          padding: 0.75rem;
          display: grid;
          gap: 0.45rem;
        }
        h2 {
          margin: 0 0 0.2rem;
          color: #2f4f88;
        }
        .formHint {
          margin: 0;
          font-size: 0.85rem;
          color: #5a6fa8;
          font-weight: 600;
        }
        input {
          width: 100%;
          border: 2px solid #d3deff;
          border-radius: 10px;
          padding: 0.5rem 0.6rem;
          font: inherit;
        }
        select {
          width: 100%;
          border: 2px solid #d3deff;
          border-radius: 10px;
          padding: 0.5rem 0.6rem;
          font: inherit;
        }
        .inputError {
          border-color: #ff8c8c;
          background: #fff5f5;
        }
        .fieldError {
          margin: -0.15rem 0 0;
          color: #cc3d3d;
          font-size: 0.9rem;
          font-weight: 600;
        }
        button {
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 0.45rem 0.7rem;
          color: #fff;
          background: #4f8cff;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}
