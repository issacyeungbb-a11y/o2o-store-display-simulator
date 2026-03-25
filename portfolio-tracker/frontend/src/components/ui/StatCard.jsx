export default function StatCard({ label, value, delta, detail, tone = "neutral" }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      {delta ? <span className="stat-card__delta">{delta}</span> : null}
      {detail ? <p className="stat-card__detail">{detail}</p> : null}
    </article>
  );
}
