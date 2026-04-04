"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <main
      className="page"
      style={{
        minHeight: "100vh",
        padding: "1rem",
        background: "linear-gradient(180deg, #9de8ff 0%, #84d7ff 55%, #75d974 100%)",
        fontFamily: '"Fredoka", sans-serif',
      }}
    >
      <section
        className="card"
        style={{
          width: "min(980px, 100%)",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "22px",
          border: "4px solid #fff",
          boxShadow: "0 14px 0 rgba(35, 51, 104, 0.16)",
          padding: "1rem",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.6rem",
            color: "#2f4f88",
            textAlign: "center",
            fontFamily: '"Baloo 2", cursive',
          }}
        >
          Trang quản trị
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#4b66a0",
            fontWeight: 600,
            marginBottom: "0.9rem",
          }}
        >
          Chọn chức năng bên dưới để quản lý học viên và thanh toán.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.8rem",
          }}
        >
          <Link
            href="/admin/payments"
            style={{
              display: "block",
              padding: "0.8rem",
              borderRadius: "16px",
              border: "2px dashed #c9d8ff",
              background: "#f7fbff",
              textDecoration: "none",
              color: "#2f4f88",
              fontWeight: 700,
            }}
          >
            <div style={{ fontSize: "1.05rem", marginBottom: "0.2rem" }}>Thanh toán chuyển khoản</div>
            <div style={{ fontSize: "0.9rem", color: "#4f67a0", fontWeight: 600 }}>
              Xác nhận các yêu cầu nâng cấp Pro / VIP đã chuyển khoản.
            </div>
          </Link>

          <Link
            href="/admin/options"
            style={{
              display: "block",
              padding: "0.8rem",
              borderRadius: "16px",
              border: "2px dashed #c9d8ff",
              background: "#f7fbff",
              textDecoration: "none",
              color: "#2f4f88",
              fontWeight: 700,
            }}
          >
            <div style={{ fontSize: "1.05rem", marginBottom: "0.2rem" }}>Cấu hình và bảo mật</div>
            <div style={{ fontSize: "0.9rem", color: "#4f67a0", fontWeight: 600 }}>
              API keys và tham số trong database (ưu tiên hơn .env).
            </div>
          </Link>

          <Link
            href="/admin/students"
            style={{
              display: "block",
              padding: "0.8rem",
              borderRadius: "16px",
              border: "2px dashed #c9d8ff",
              background: "#f7fbff",
              textDecoration: "none",
              color: "#2f4f88",
              fontWeight: 700,
            }}
          >
            <div style={{ fontSize: "1.05rem", marginBottom: "0.2rem" }}>Quản lý học viên</div>
            <div style={{ fontSize: "0.9rem", color: "#4f67a0", fontWeight: 600 }}>
              (Tính năng chi tiết có thể thêm sau.)
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}