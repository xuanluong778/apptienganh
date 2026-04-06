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
    <main className="home-main">
      <section className="home-hero">
        <h1 className="home-hero-title">Kids English App</h1>
        <p className="home-hero-sub">Choose a fun activity and start learning.</p>
        <div className="home-hero-links">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="home-hero-link">
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
