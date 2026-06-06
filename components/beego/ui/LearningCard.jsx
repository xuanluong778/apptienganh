import Link from "next/link";

export default function LearningCard({ href, onClick, icon, title, description, ariaLabel }) {
  const content = (
    <>
      {icon ? (
        <div className="beego-learning-card-icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="beego-learning-card" aria-label={ariaLabel || title}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="beego-learning-card" onClick={onClick} aria-label={ariaLabel || title} style={{ width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
      {content}
    </button>
  );
}
