import Link from "next/link";

export default function BigCTAButton({ href, onClick, children, variant = "primary", type = "button", disabled, ariaLabel }) {
  const className = `beego-big-cta ${variant === "secondary" ? "beego-big-cta--secondary" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
