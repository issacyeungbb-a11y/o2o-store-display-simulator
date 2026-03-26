export default function EmptyState({ title, description, actionLabel }) {
  return (
    <div className="empty-state card-surface">
      <p className="eyebrow">Coming Soon</p>
      <h3>{title}</h3>
      <p className="section-copy">{description}</p>
      {actionLabel ? <button className="button button--ghost">{actionLabel}</button> : null}
    </div>
  );
}
