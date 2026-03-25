import PnLBadge from "./PnLBadge";

const styles = {
  card: (color, isActive) => ({
    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    border: `1px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
    borderRadius: 20,
    padding: "1.15rem",
    cursor: "pointer",
    boxShadow: isActive ? `0 0 0 1px ${color}, 0 18px 48px ${color}22` : "0 16px 38px rgba(0,0,0,0.24)",
    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
    textAlign: "left",
  }),
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.8rem",
    marginBottom: "0.9rem",
  },
  broker: {
    fontFamily: "'Cormorant Garamond', serif",
    color: "#f5f0e8",
    fontSize: "1.7rem",
    lineHeight: 1,
  },
  accounts: {
    color: "rgba(255,255,255,0.38)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.74rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  value: {
    fontFamily: "'DM Mono', monospace",
    color: "#f0f0f0",
    fontSize: "1.32rem",
    marginBottom: "0.85rem",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.9rem",
  },
  positions: {
    color: "rgba(255,255,255,0.36)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.78rem",
    letterSpacing: "0.06em",
  },
};

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AccountCard({ summary, color, isActive, onClick, displayCurrency }) {
  const totalValue = displayCurrency === "HKD" ? summary.total_market_value_hkd : summary.total_market_value_usd;
  const totalPnl = displayCurrency === "HKD" ? summary.total_pnl_hkd : summary.total_pnl_usd;
  const totalCost = displayCurrency === "HKD" ? summary.total_cost_hkd : summary.total_cost_usd;
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0;

  return (
    <button type="button" onClick={onClick} style={styles.card(color, isActive)}>
      <div style={styles.topRow}>
        <div>
          <strong style={styles.broker}>{summary.label}</strong>
          <div style={styles.accounts}>{summary.account_count} 個位置 / {summary.asset_count} 項資產</div>
        </div>
      </div>
      <div style={styles.value}>{formatCurrency(totalValue, displayCurrency)}</div>
      <div style={styles.meta}>
        <PnLBadge pnl={totalPnl} pnlPct={totalPnlPct} currency={displayCurrency} />
        <span style={styles.positions}>{summary.source.toUpperCase()}</span>
      </div>
    </button>
  );
}
