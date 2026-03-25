const styles = {
  badge: (positive) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.42rem 0.68rem",
    borderRadius: "999px",
    border: `1px solid ${positive ? "rgba(74, 222, 128, 0.28)" : "rgba(248, 113, 113, 0.28)"}`,
    background: positive ? "rgba(74, 222, 128, 0.08)" : "rgba(248, 113, 113, 0.08)",
    color: positive ? "#4ade80" : "#f87171",
    fontSize: "0.8rem",
    letterSpacing: "0.03em",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
  }),
};

function formatAmount(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

export default function PnLBadge({ pnl, pnlPct, currency = "USD" }) {
  const positive = pnl >= 0;
  return (
    <span style={styles.badge(positive)}>
      <span>{positive ? "▲" : "▼"}</span>
      <span>{formatAmount(pnl, currency)}</span>
      <span>({Math.abs(pnlPct).toFixed(2)}%)</span>
    </span>
  );
}
