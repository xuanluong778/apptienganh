"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notifyAuthChanged } from "@/hooks/useAuthLoggedIn";
import "./auth.css";

function safeNextDestination(raw) {
  if (!raw || typeof raw !== "string") return "/";
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  if (p.includes("..") || p.includes("\\")) return "/";
  if (p === "/auth" || p.startsWith("/auth?") || p.startsWith("/auth/")) return "/";
  return p;
}

const NOTICES = {
  google_off: "Đăng nhập Google chưa bật (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trên server).",
  google_denied: "Bạn đã hủy đăng nhập Google.",
  google_state: "Phiên đăng nhập Google không hợp lệ. Thử lại.",
  google_token: "Không lấy được token từ Google.",
  google_email: "Google không cung cấp email hợp lệ.",
  google_user: "Không tạo được tài khoản. Thử lại sau.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [panel, setPanel] = useState("login");
  const [nextDest, setNextDest] = useState("/");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPwLogin, setShowPwLogin] = useState(false);

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOtpToken, setRegOtpToken] = useState("");
  const [showPwReg, setShowPwReg] = useState(false);

  const [busy, setBusy] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [alert, setAlert] = useState({ type: "", text: "" });
  const [fieldError, setFieldError] = useState("");

  const showAlert = useCallback((type, text) => {
    setAlert(type && text ? { type, text } : { type: "", text: "" });
  }, []);

  const fetchMe = async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json();
    return response.ok && result.success ? result.data : null;
  };

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dest = safeNextDestination(sp.get("next")) || "/";
    setNextDest(dest);
    const notice = sp.get("notice");
    if (notice && NOTICES[notice]) {
      showAlert("err", NOTICES[notice]);
    }

    let cancelled = false;
    (async () => {
      const u = await fetchMe();
      if (!cancelled && u) {
        router.replace(dest);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, showAlert]);

  async function handleLogin(e) {
    e.preventDefault();
    setFieldError("");
    showAlert("", "");
    const digits = loginPhone.replace(/[^\d+]/g, "").trim();
    if (digits.replace(/\D/g, "").length < 9) {
      setFieldError("Nhập số điện thoại hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: digits, password: loginPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        showAlert("err", result.message || "Đăng nhập thất bại.");
        return;
      }
      setLoginPhone("");
      setLoginPassword("");
      notifyAuthChanged();
      router.replace(nextDest);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp() {
    setFieldError("");
    showAlert("", "");
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const phoneDigits = regPhone.replace(/[^\d+]/g, "").trim();
    if (!name) {
      setFieldError("Nhập họ tên.");
      return;
    }
    if (phoneDigits.replace(/\D/g, "").length < 9) {
      setFieldError("Nhập số điện thoại hợp lệ.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Nhập email hợp lệ.");
      return;
    }
    setOtpSending(true);
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_type: "email", contact_value: email }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFieldError(result.message || "Không gửi được OTP.");
        return;
      }
      setRegOtpToken(result.data?.otp_token || "");
      setRegOtp("");
      showAlert("ok", result.message || "Đã gửi mã OTP đến email.");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setFieldError("");
    if (!regOtpToken) {
      setFieldError("Vui lòng gửi mã OTP đến email trước khi hoàn tất đăng ký.");
      return;
    }
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const phoneDigits = regPhone.replace(/[^\d+]/g, "").trim();
    if (!name || phoneDigits.replace(/\D/g, "").length < 9 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Kiểm tra lại họ tên, SĐT và email.");
      return;
    }
    if (!regOtp.trim() || regPassword.length < 6) {
      setFieldError("Nhập mã OTP và mật khẩu (tối thiểu 6 ký tự).");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phoneDigits,
          password: regPassword,
          otp_token: regOtpToken,
          otp_code: regOtp.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFieldError(result.message || "Đăng ký thất bại.");
        return;
      }
      showAlert("ok", result.message || "Đăng ký thành công!");
      notifyAuthChanged();
      window.setTimeout(() => router.replace(nextDest), 800);
    } finally {
      setBusy(false);
    }
  }

  const googleHref = `/api/auth/google?next=${encodeURIComponent(nextDest)}`;

  return (
    <main className="auth-route">
      <div className="auth-glass">
        <div className="auth-forms">
          {panel === "login" ? (
          <div className="auth-panel" aria-hidden={false}>
            <h1 className="auth-title">Chào mừng trở lại Beego</h1>
            <p className="auth-subtitle">Đăng nhập beego.vn — học tiếng Anh bằng AI</p>

            {alert.text ? (
              <div className={alert.type === "ok" ? "auth-alert auth-alert--ok" : "auth-alert"}>{alert.text}</div>
            ) : null}

            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-phone">
                  Số điện thoại
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="login-phone"
                    className={`auth-input ${fieldError && panel === "login" ? "auth-input--error" : ""}`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0xxxxxxxxx"
                    value={loginPhone}
                    onChange={(e) => {
                      setLoginPhone(e.target.value);
                      setFieldError("");
                    }}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-pw">
                  Mật khẩu
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="login-pw"
                    className="auth-input"
                    type={showPwLogin ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw"
                    onClick={() => setShowPwLogin((v) => !v)}
                    aria-label={showPwLogin ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPwLogin ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
              {fieldError && panel === "login" ? <p className="auth-hint">{fieldError}</p> : null}

              <button type="submit" className="auth-btn-primary" disabled={busy}>
                Đăng nhập
              </button>
            </form>

            <div className="auth-divider">hoặc tiếp tục với</div>
            <a href={googleHref} className="auth-social" style={{ textDecoration: "none" }}>
              <GoogleIcon />
              Google
            </a>

            <p className="auth-footer">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setPanel("register");
                  setFieldError("");
                  showAlert("", "");
                }}
              >
                Đăng ký
              </button>
            </p>
          </div>
          ) : (
          <div className="auth-panel" aria-hidden={false}>
            <h1 className="auth-title">Tham gia Beego</h1>
            <p className="auth-subtitle">Tạo tài khoản beego.vn và chọn mục tiêu học</p>

            {alert.text ? (
              <div className={alert.type === "ok" ? "auth-alert auth-alert--ok" : "auth-alert"}>{alert.text}</div>
            ) : null}

            <form onSubmit={handleRegister}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-name">
                  Họ tên <span style={{ color: "#fda4af" }}>*</span>
                </label>
                <input
                  id="reg-name"
                  className="auth-input"
                  style={{ paddingRight: "0.85rem" }}
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-row-split">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-phone">
                    Số điện thoại <span style={{ color: "#fda4af" }}>*</span>
                  </label>
                  <input
                    id="reg-phone"
                    className="auth-input"
                    style={{ paddingRight: "0.85rem" }}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0xxxxxxxxx"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-email">
                    Email <span style={{ color: "#fda4af" }}>*</span>
                  </label>
                  <input
                    id="reg-email"
                    className="auth-input"
                    style={{ paddingRight: "0.85rem" }}
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                className="auth-btn-otp"
                onClick={handleSendOtp}
                disabled={busy || otpSending}
                aria-busy={otpSending}
              >
                <span className="auth-btn-otp-inner">
                  {otpSending ? <span className="auth-spinner" aria-hidden /> : null}
                  {otpSending ? "Đang gửi…" : "Gửi mã OTP đến email"}
                </span>
              </button>

              {regOtpToken ? (
                <p className="auth-hint">Đã gửi OTP. Kiểm tra hộp thư rồi nhập mã bên dưới.</p>
              ) : (
                <p className="auth-hint">Bấm nút trên để nhận mã OTP trước khi đặt mật khẩu.</p>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-otp">
                  Mã OTP
                </label>
                <input
                  id="reg-otp"
                  className="auth-input"
                  style={{ paddingRight: "0.85rem" }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="6 chữ số"
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={!regOtpToken}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-pw">
                  Mật khẩu
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="reg-pw"
                    className="auth-input"
                    type={showPwReg ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                    disabled={!regOtpToken}
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw"
                    onClick={() => setShowPwReg((v) => !v)}
                    disabled={!regOtpToken}
                    aria-label={showPwReg ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPwReg ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              {fieldError ? <p className="auth-hint">{fieldError}</p> : null}

              <button type="submit" className="auth-btn-primary" disabled={busy || !regOtpToken || otpSending}>
                Hoàn tất đăng ký
              </button>
            </form>

            <p className="auth-footer">
              Đã có tài khoản?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setPanel("login");
                  setFieldError("");
                  showAlert("", "");
                }}
              >
                Đăng nhập
              </button>
            </p>
          </div>
          )}
        </div>
      </div>
    </main>
  );
}
