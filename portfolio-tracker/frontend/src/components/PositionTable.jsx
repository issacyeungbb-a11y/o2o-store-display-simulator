import { useState } from "react";

import PnLBadge from "./PnLBadge";

const ASSET_TYPES = [
  { value: "stock", label: "股票" },
  { value: "etf", label: "ETF" },
  { value: "fund", label: "基金" },
  { value: "cash", label: "現金" },
  { value: "crypto", label: "加密貨幣" },
  { value: "bond", label: "債券" },
  { value: "option", label: "期權" },
  { value: "other", label: "其他" },
];

const CURRENCY_OPTIONS = ["HKD", "USD", "USDT", "JPY", "CNY", "CNH", "SGD", "AUD", "CAD", "EUR"];
const SOURCE_OPTIONS = [
  { value: "futu", label: "富途" },
  { value: "ib", label: "盈透證券" },
  { value: "crypto", label: "加密貨幣" },
  { value: "other", label: "其他" },
];

const styles = {
  wrapper: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 22,
    overflow: "hidden",
  },
  scroll: {
    overflowX: "auto",
  },
  header: {
    minWidth: 1060,
    display: "grid",
    gridTemplateColumns: "1.45fr 1.35fr 0.8fr 0.7fr 0.95fr 0.95fr 0.95fr 150px",
    gap: "1rem",
    padding: "1rem 1.2rem",
    color: "rgba(255,255,255,0.38)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.76rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  row: {
    minWidth: 1060,
    display: "grid",
    gridTemplateColumns: "1.45fr 1.35fr 0.8fr 0.7fr 0.95fr 0.95fr 0.95fr 150px",
    gap: "1rem",
    alignItems: "center",
    padding: "1rem 1.2rem",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    transition: "background 160ms ease",
  },
  assetCell: {
    minWidth: 0,
  },
  symbol: {
    color: "#f5f0e8",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "1.3rem",
    lineHeight: 1,
  },
  name: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "0.82rem",
    marginTop: "0.18rem",
  },
  mono: {
    color: "#f0f0f0",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.85rem",
    lineHeight: 1.6,
  },
  numeric: {
    color: "#f0f0f0",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.85rem",
    lineHeight: 1.6,
    textAlign: "right",
  },
  subtext: {
    color: "rgba(255,255,255,0.32)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.7rem",
    lineHeight: 1.55,
  },
  actions: {
    display: "flex",
    gap: "0.45rem",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  editAction: {
    borderRadius: 999,
    border: "1px solid rgba(96,165,250,0.24)",
    background: "rgba(96,165,250,0.08)",
    color: "#bfdbfe",
    padding: "0.55rem 0.75rem",
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
  },
  action: {
    borderRadius: 999,
    border: "1px solid rgba(248,113,113,0.25)",
    background: "rgba(248,113,113,0.08)",
    color: "#fca5a5",
    padding: "0.55rem 0.75rem",
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
  },
  empty: {
    padding: "2.2rem 1.2rem",
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontFamily: "'DM Mono', monospace",
  },
  skeleton: {
    height: 16,
    width: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
    backgroundSize: "220% 100%",
    animation: "shimmer 1.4s infinite linear",
  },
  editorShell: {
    minWidth: 1060,
    padding: "0 1.2rem 1.15rem",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(255,255,255,0.025)",
  },
  editorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.85rem",
    marginTop: "0.95rem",
  },
  editorField: {
    display: "grid",
    gap: "0.38rem",
  },
  editorLabel: {
    color: "rgba(255,255,255,0.32)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#f0f0f0",
    padding: "0.75rem 0.85rem",
    fontSize: "0.92rem",
    boxSizing: "border-box",
  },
  editorActions: {
    display: "flex",
    gap: "0.6rem",
    justifyContent: "flex-end",
    marginTop: "1rem",
  },
  saveAction: {
    borderRadius: 12,
    border: "1px solid rgba(74,222,128,0.24)",
    background: "rgba(74,222,128,0.1)",
    color: "#bbf7d0",
    padding: "0.75rem 0.95rem",
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
  },
  cancelAction: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#f0f0f0",
    padding: "0.75rem 0.95rem",
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
  },
};

function createDraft(asset) {
  return {
    source: asset.source,
    account_name: asset.account_name,
    symbol: asset.symbol,
    name: asset.name,
    quote_symbol: asset.quote_symbol || "",
    asset_type: asset.asset_type,
    quantity: asset.quantity,
    unit_cost: asset.unit_cost,
    price: asset.price,
    currency: asset.currency,
    notes: asset.notes || "",
    thesis: asset.thesis || "",
  };
}

function formatNumber(value, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

function formatPrice(value, assetType, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: assetType === "crypto" ? 6 : 2,
  }).format(value);
}

function formatTime(timestamp) {
  if (!timestamp) {
    return "未同步";
  }

  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getValueInCurrency(asset, displayCurrency) {
  return displayCurrency === "HKD" ? asset.marketValueHkd : asset.marketValueUsd;
}

function getPnlInCurrency(asset, displayCurrency) {
  return displayCurrency === "HKD" ? asset.pnlHkd : asset.pnlUsd;
}

function getSourceLabel(source) {
  return SOURCE_OPTIONS.find((option) => option.value === source)?.label || source;
}

export default function PositionTable({ assets, loading, displayCurrency, saving, onSaveEdit, onDelete }) {
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(null);

  const handleStartEdit = (asset) => {
    setEditingId(asset.id);
    setDraft(createDraft(asset));
  };

  const handleCancelEdit = () => {
    setEditingId("");
    setDraft(null);
  };

  const handleDraftChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSaveEdit = async (assetId) => {
    if (!draft) {
      return;
    }

    await onSaveEdit(assetId, draft);
    handleCancelEdit();
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.scroll}>
          <div style={styles.header}>
            <span>資產</span>
            <span>來自帳戶</span>
            <span>類型</span>
            <span style={{ textAlign: "right" }}>數量</span>
            <span style={{ textAlign: "right" }}>現價</span>
            <span style={{ textAlign: "right" }}>市值</span>
            <span style={{ textAlign: "right" }}>盈虧</span>
            <span style={{ textAlign: "right" }}>操作</span>
          </div>
          {[0, 1, 2].map((row) => (
            <div key={row} style={styles.row}>
              {Array.from({ length: 8 }).map((_, column) => (
                <div key={column} style={styles.skeleton} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!assets.length) {
    return <div style={styles.empty}>目前未有資產，先用手動輸入或者請 AI 幫你整理一批。</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.scroll}>
        <div style={styles.header}>
          <span>資產</span>
          <span>來自帳戶</span>
          <span>類型</span>
          <span style={{ textAlign: "right" }}>數量</span>
          <span style={{ textAlign: "right" }}>現價</span>
          <span style={{ textAlign: "right" }}>市值</span>
          <span style={{ textAlign: "right" }}>盈虧</span>
          <span style={{ textAlign: "right" }}>操作</span>
        </div>
        {assets.map((asset) => (
          <div key={asset.id}>
            <div
              style={styles.row}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              <div style={styles.assetCell}>
                <div style={styles.symbol}>{asset.symbol}</div>
                <div style={styles.name}>{asset.name}</div>
                {asset.quote_symbol && asset.quote_symbol !== asset.symbol ? <div style={styles.subtext}>行情代號 {asset.quote_symbol}</div> : null}
              </div>
              <div>
                <div style={styles.mono}>{asset.account_name}</div>
                <div style={styles.subtext}>{asset.sourceLabel}</div>
              </div>
              <div style={styles.mono}>{asset.asset_type}</div>
              <div style={styles.numeric}>{formatNumber(asset.quantity, asset.asset_type === "crypto" ? 6 : 2)}</div>
              <div style={styles.numeric}>
                <div>{formatPrice(asset.price, asset.asset_type, asset.currency)}</div>
                <div style={styles.subtext}>{asset.price_source ? `${asset.price_source} · ${formatTime(asset.price_updated_at)}` : "手動價格"}</div>
              </div>
              <div style={styles.numeric}>{formatCurrency(getValueInCurrency(asset, displayCurrency), displayCurrency)}</div>
              <div style={{ textAlign: "right" }}>
                <PnLBadge pnl={getPnlInCurrency(asset, displayCurrency)} pnlPct={asset.pnl_pct} currency={displayCurrency} />
              </div>
              <div style={styles.actions}>
                <button type="button" style={styles.editAction} onClick={() => handleStartEdit(asset)}>
                  編輯
                </button>
                <button type="button" style={styles.action} onClick={() => onDelete(asset.id)}>
                  刪除
                </button>
              </div>
            </div>

            {editingId === asset.id && draft ? (
              <div style={styles.editorShell}>
                <div style={styles.editorGrid}>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>來源</span>
                    <select style={styles.input} value={draft.source} onChange={(event) => handleDraftChange("source", event.target.value)}>
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>帳戶</span>
                    <input style={styles.input} value={draft.account_name} onChange={(event) => handleDraftChange("account_name", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>類型</span>
                    <select style={styles.input} value={draft.asset_type} onChange={(event) => handleDraftChange("asset_type", event.target.value)}>
                      {ASSET_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>代號</span>
                    <input style={styles.input} value={draft.symbol} onChange={(event) => handleDraftChange("symbol", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>名稱</span>
                    <input style={styles.input} value={draft.name} onChange={(event) => handleDraftChange("name", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>行情代號</span>
                    <input style={styles.input} value={draft.quote_symbol} onChange={(event) => handleDraftChange("quote_symbol", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>貨幣</span>
                    <select style={styles.input} value={draft.currency} onChange={(event) => handleDraftChange("currency", event.target.value)}>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>數量</span>
                    <input style={styles.input} type="number" step="any" value={draft.quantity} onChange={(event) => handleDraftChange("quantity", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>平均成本</span>
                    <input style={styles.input} type="number" step="any" value={draft.unit_cost} onChange={(event) => handleDraftChange("unit_cost", event.target.value)} />
                  </label>
                  <label style={styles.editorField}>
                    <span style={styles.editorLabel}>現價</span>
                    <input style={styles.input} type="number" step="any" value={draft.price} onChange={(event) => handleDraftChange("price", event.target.value)} />
                  </label>
                </div>

                <div style={styles.editorActions}>
                  <button type="button" style={styles.cancelAction} onClick={handleCancelEdit}>
                    取消
                  </button>
                  <button type="button" style={styles.saveAction} onClick={() => handleSaveEdit(asset.id)}>
                    {saving ? "儲存中..." : "儲存修改"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
