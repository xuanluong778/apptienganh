export default function EmptyState({ icon = "🐝", title, description, action }) {
  return (
    <div className="beego-empty" role="status">
      <div className="beego-empty-icon" aria-hidden>
        {icon}
      </div>
      {title ? <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-heading), Oswald, sans-serif" }}>{title}</h3> : null}
      {description ? <p style={{ margin: "0 0 16px", color: "var(--beego-ink-soft)", fontWeight: 600 }}>{description}</p> : null}
      {action}
    </div>
  );
}
