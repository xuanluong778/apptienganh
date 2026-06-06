export default function ProgressRing({ value = 0, size = 88, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="beego-progress-ring-wrap" style={{ width: size, height: size }} role="img" aria-label={label || `Tiến độ ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="beego-progress-ring-label">{label ?? `${pct}%`}</span>
    </div>
  );
}
