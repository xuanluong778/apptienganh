export default function Stepper({ total = 3, current = 0 }) {
  return (
    <div className="beego-stepper" role="progressbar" aria-valuemin={0} aria-valuemax={total - 1} aria-valuenow={current} aria-label={`Bước ${current + 1} trên ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`beego-stepper-dot ${i < current ? "beego-stepper-dot--done" : ""} ${i === current ? "beego-stepper-dot--active" : ""}`}
        />
      ))}
    </div>
  );
}
