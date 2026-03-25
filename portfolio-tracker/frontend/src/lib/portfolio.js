const USD_PER_CURRENCY = {
  USD: 1,
  USDT: 1,
  HKD: 0.128,
  JPY: 0.0067,
  CNH: 0.138,
  CNY: 0.138,
  SGD: 0.74,
  AUD: 0.66,
  CAD: 0.74,
  EUR: 1.09,
};

const SOURCE_LABELS = {
  futu: "富途",
  ib: "盈透證券",
  crypto: "加密貨幣",
  other: "其他",
};

export const DEMO_ASSETS = [
  {
    id: "demo-futu-700",
    source: "futu",
    account_name: "富途 保證金綜合",
    symbol: "HK.00700",
    quote_symbol: "700.HK",
    name: "騰訊控股",
    asset_type: "stock",
    quantity: 200,
    unit_cost: 318,
    price: 368,
    currency: "HKD",
    notes: "Demo 資產，可刪除。",
    thesis: "港股核心科技權重。",
    price_source: "Demo",
    price_updated_at: "2026-03-17T00:00:00+00:00",
    updated_at: "2026-03-17T00:00:00+00:00",
  },
  {
    id: "demo-futu-cash",
    source: "futu",
    account_name: "富途 現金綜合",
    symbol: "CASH.HKD",
    name: "港幣現金",
    asset_type: "cash",
    quantity: 85000,
    unit_cost: 1,
    price: 1,
    currency: "HKD",
    notes: "",
    thesis: "保留流動性。",
    price_source: "手動",
    price_updated_at: "2026-03-17T00:00:00+00:00",
    updated_at: "2026-03-17T00:00:00+00:00",
  },
  {
    id: "demo-ib-nvda",
    source: "ib",
    account_name: "IB 主賬戶",
    symbol: "NVDA",
    quote_symbol: "NVDA",
    name: "NVIDIA",
    asset_type: "stock",
    quantity: 35,
    unit_cost: 102,
    price: 118,
    currency: "USD",
    notes: "",
    thesis: "AI 基建示範持倉。",
    price_source: "Demo",
    price_updated_at: "2026-03-17T00:00:00+00:00",
    updated_at: "2026-03-17T00:00:00+00:00",
  },
  {
    id: "demo-crypto-btc",
    source: "crypto",
    account_name: "Ledger 冷錢包",
    symbol: "BTC",
    quote_symbol: "bitcoin",
    name: "Bitcoin",
    asset_type: "crypto",
    quantity: 0.35,
    unit_cost: 58200,
    price: 69800,
    currency: "USD",
    notes: "",
    thesis: "數碼黃金配置。",
    price_source: "Demo",
    price_updated_at: "2026-03-17T00:00:00+00:00",
    updated_at: "2026-03-17T00:00:00+00:00",
  },
];

export function convertAmount(value, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return value;
  }

  const fromRate = USD_PER_CURRENCY[fromCurrency] ?? 1;
  const toRate = USD_PER_CURRENCY[toCurrency] ?? 1;
  const usdValue = value * fromRate;
  return usdValue / toRate;
}

export function materializeAsset(record) {
  const quantity = Number(record.quantity || 0);
  const unitCost = Number(record.unit_cost || 0);
  const price = Number(record.price || 0);
  const marketValue = quantity * price;
  const costBasis = quantity * unitCost;
  const pnl = marketValue - costBasis;
  const pnlPct = costBasis ? (pnl / costBasis) * 100 : 0;

  return {
    ...record,
    quantity,
    unit_cost: unitCost,
    price,
    quote_symbol: record.quote_symbol || "",
    price_source: record.price_source || "",
    price_updated_at: record.price_updated_at || "",
    price_status: record.price_status || "",
    quote_error: record.quote_error || "",
    market_value: marketValue,
    cost_basis: costBasis,
    pnl,
    pnl_pct: pnlPct,
    sourceLabel: SOURCE_LABELS[record.source] ?? record.source,
    marketValueHkd: convertAmount(marketValue, record.currency, "HKD"),
    marketValueUsd: convertAmount(marketValue, record.currency, "USD"),
    pnlHkd: convertAmount(pnl, record.currency, "HKD"),
    pnlUsd: convertAmount(pnl, record.currency, "USD"),
  };
}

function buildTotals(assets) {
  const total_market_value_hkd = assets.reduce((sum, asset) => sum + asset.marketValueHkd, 0);
  const total_market_value_usd = assets.reduce((sum, asset) => sum + asset.marketValueUsd, 0);
  const total_cost_hkd = assets.reduce((sum, asset) => sum + convertAmount(asset.cost_basis, asset.currency, "HKD"), 0);
  const total_cost_usd = assets.reduce((sum, asset) => sum + convertAmount(asset.cost_basis, asset.currency, "USD"), 0);
  const total_pnl_hkd = total_market_value_hkd - total_cost_hkd;
  const total_pnl_usd = total_market_value_usd - total_cost_usd;

  return {
    asset_count: assets.length,
    total_market_value_hkd,
    total_market_value_usd,
    total_cost_hkd,
    total_cost_usd,
    total_pnl_hkd,
    total_pnl_usd,
  };
}

export function buildPortfolio(records) {
  const assets = records.map(materializeAsset).sort((left, right) => right.marketValueHkd - left.marketValueHkd);
  const sourceGroups = new Map();
  const accountGroups = new Map();

  for (const asset of assets) {
    const sourceBucket = sourceGroups.get(asset.source) ?? [];
    sourceBucket.push(asset);
    sourceGroups.set(asset.source, sourceBucket);

    const accountKey = `${asset.source}::${asset.account_name}`;
    const accountBucket = accountGroups.get(accountKey) ?? [];
    accountBucket.push(asset);
    accountGroups.set(accountKey, accountBucket);
  }

  const sources = Array.from(sourceGroups.entries()).map(([source, items]) => ({
    source,
    label: SOURCE_LABELS[source] ?? source,
    account_count: new Set(items.map((item) => item.account_name)).size,
    ...buildTotals(items),
  }));

  const accounts = Array.from(accountGroups.entries()).map(([key, items]) => {
    const [source, account_name] = key.split("::");
    return {
      source,
      label: SOURCE_LABELS[source] ?? source,
      account_name,
      ...buildTotals(items),
    };
  });

  return {
    assets,
    sources: sources.sort((left, right) => right.total_market_value_hkd - left.total_market_value_hkd),
    accounts: accounts.sort((left, right) => right.total_market_value_hkd - left.total_market_value_hkd),
    totals: buildTotals(assets),
    generated_at: new Date().toISOString(),
  };
}

export function fallbackInsights(portfolio) {
  if (!portfolio.assets.length) {
    return ["目前資產庫是空的，先新增幾項資產，AI 分析先會更有意思。"];
  }
  const topSource = portfolio.sources[0];
  const largestAssets = portfolio.assets.slice(0, 3).map((asset) => `${asset.symbol} (${asset.currency} ${asset.market_value.toFixed(0)})`);
  return [
    `目前最大來源是 ${topSource.label}，約值 HK$${topSource.total_market_value_hkd.toFixed(0)}。`,
    `目前最大資產包括：${largestAssets.join("、")}。`,
    "如果你要更準確的分析，建議補充現金、成本價與最近交易變化。",
  ];
}

export { SOURCE_LABELS };
