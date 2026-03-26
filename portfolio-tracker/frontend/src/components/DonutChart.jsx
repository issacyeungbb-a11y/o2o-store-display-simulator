const SIZE = 232;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const styles = {
  wrapper: {
    position: "relative",
    width: SIZE,
    height: SIZE,
    display: "grid",
    placeItems: "center",
  },
  center: {
    position: "absolute",
    display: "grid",
    gap: "0.28rem",
    textAlign: "center",
  },
  label: {
    color: "rgba(255,255,255,0.38)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  value: {
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "2.35rem",
    lineHeight: 1,
  },
};

function compactValue(value, currency) {
  const symbol = currency === "HKD" ? "HK$" : "US$";
  if (value >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(2)}M`;
  }
  return `${symbol}${(value / 1000).toFixed(1)}K`;
}

export default function DonutChart({ segments, totalValue, currency = "HKD" }) {
  let offset = 0;
  const safeTotal = Math.max(totalValue, 1);

  return (
    <div style={styles.wrapper}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={STROKE}
          />
          {segments.map((segment) => {
            const length = (segment.value / safeTotal) * CIRCUMFERENCE;
            const circle = (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${Math.max(CIRCUMFERENCE - length, 0)}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += length;
            return circle;
          })}
        </g>
      </svg>
      <div style={styles.center}>
        <span style={styles.label}>總資產</span>
        <strong style={styles.value}>{compactValue(totalValue, currency)}</strong>
      </div>
    </div>
  );
}
