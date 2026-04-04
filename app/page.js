import Link from "next/link";

const links = [
  { href: "/lessons", label: "Lessons" },
  { href: "/quiz", label: "Quiz" },
  { href: "/matching", label: "Matching Game" },
  { href: "/memory", label: "Memory Game" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vocabulary", label: "1000 Vocab" },
  { href: "/admin", label: "Admin Import" },
  { href: "/auth", label: "Login / Register" },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "transparent",
      }}
    >
      <section
        style={{
          width: "min(780px, 96vw)",
          background: "#fff",
          borderRadius: "28px",
          padding: "24px",
          border: "4px solid #fff",
          boxShadow: "0 14px 0 rgba(35, 51, 104, 0.16)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            textAlign: "center",
            color: "#2f4f88",
            fontSize: "clamp(2rem, 6vw, 3.2rem)",
          }}
        >
          Kids English App
        </h1>
        <p style={{ textAlign: "center", color: "#4d67a0", fontSize: "1.1rem" }}>
          Choose a fun activity and start learning.
        </p>
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                color: "#fff",
                background: "linear-gradient(180deg, #72d9ff, #4f8cff)",
                padding: "14px 14px",
                borderRadius: "16px",
                fontWeight: 700,
                fontSize: "1.1rem",
                border: "3px solid #fff",
                boxShadow: "0 7px 0 rgba(0, 0, 0, 0.15)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
