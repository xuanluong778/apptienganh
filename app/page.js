import Link from "next/link";

const links = [
  { href: "/", label: "Trang chủ", icon: "🏠", cta: true },
  { href: "/lessons", label: "Bài học", icon: "📘", cta: true },
  { href: "/quiz", label: "Quiz", icon: "🧠", cta: true },
  { href: "/pronunciation", label: "Phát Âm IPA", icon: "🎙️", cta: true },
  { href: "/vocabulary", label: "Từ vựng", icon: "📚", cta: true },
  { href: "/admin", label: "Quản trị", icon: "⚙️", cta: false },
];

export default function HomePage() {
  return (
    <main className="home-main">
      <section className="home-menu-list" aria-label="Danh mục chính">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="home-menu-item">
            <span className="home-menu-thumb" aria-hidden>
              {item.icon}
            </span>
            <span className="home-menu-label">{item.label}</span>
            {item.cta ? <span className="home-menu-cta">HỌC NGAY</span> : <span className="home-menu-empty" />}
          </Link>
        ))}
      </section>
    </main>
  );
}
