import { convertAmount } from "./portfolio";
import { quoteAssetsWithGemini } from "./gemini";

const AUTO_REFRESH_MINUTES = Math.max(1, Number(import.meta.env.VITE_MARKET_AUTO_REFRESH_MINUTES || 5));

const CASH_ASSET_TYPES = new Set(["cash"]);
const CRYPTO_ASSET_TYPES = new Set(["crypto"]);

const CRYPTO_SYMBOL_TO_ID = {
  ADA: "cardano",
  ARB: "arbitrum",
  AVAX: "avalanche-2",
  BCH: "bitcoin-cash",
  BNB: "binancecoin",
  BTC: "bitcoin",
  DOGE: "dogecoin",
  DOT: "polkadot",
  ETH: "ethereum",
  LINK: "chainlink",
  LTC: "litecoin",
  MATIC: "matic-network",
  SOL: "solana",
  TON: "the-open-network",
  TRX: "tron",
  UNI: "uniswap",
  USDC: "usd-coin",
  USDT: "tether",
  XRP: "ripple",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function sanitizeSecuritySymbol(symbol) {
  return normalizeText(symbol).replace(/\s+/g, "").toUpperCase();
}

function getHongKongDigits(symbol) {
  const rawSymbol = sanitizeSecuritySymbol(symbol);
  if (!rawSymbol) {
    return "";
  }

  if (rawSymbol.startsWith("HK.")) {
    return rawSymbol.slice(3).replace(/[^0-9]/g, "");
  }

  if (rawSymbol.endsWith(".HK")) {
    return rawSymbol.replace(/\.HK$/, "").replace(/[^0-9]/g, "");
  }

  if (/^[0-9]{1,5}$/.test(rawSymbol)) {
    return rawSymbol;
  }

  return "";
}

function getHongKongPrimarySymbol(symbol) {
  const rawDigits = getHongKongDigits(symbol);
  if (!rawDigits) {
    return "";
  }

  const numeric = String(Number(rawDigits));
  return `${numeric.padStart(4, "0")}.HK`;
}

function isCashAsset(asset) {
  return CASH_ASSET_TYPES.has(asset.asset_type);
}

function isCryptoAsset(asset) {
  return CRYPTO_ASSET_TYPES.has(asset.asset_type);
}

function getCryptoQuoteId(asset) {
  if (asset.quote_symbol) {
    return normalizeText(asset.quote_symbol).toLowerCase();
  }

  const symbol = sanitizeSecuritySymbol(asset.symbol).replace(/^CRYPTO\./, "");
  if (CRYPTO_SYMBOL_TO_ID[symbol]) {
    return CRYPTO_SYMBOL_TO_ID[symbol];
  }

  const nameCandidate = normalizeText(asset.name).toLowerCase().replace(/\s+/g, "-");
  return nameCandidate || "";
}

function getPreferredSecuritySymbol(asset) {
  const rawSymbol = sanitizeSecuritySymbol(asset.quote_symbol || asset.symbol);
  if (!rawSymbol) {
    return "";
  }

  const hongKongSymbol = getHongKongPrimarySymbol(rawSymbol);
  if (hongKongSymbol) {
    return hongKongSymbol;
  }

  if (rawSymbol.startsWith("US.")) {
    return rawSymbol.slice(3);
  }

  return rawSymbol;
}

function buildQuoteFields(asset, { latestPrice, priceCurrency, quoteSymbol }) {
  let normalizedPrice = Number(latestPrice);
  if (!Number.isFinite(normalizedPrice)) {
    return null;
  }

  const responseCurrency = normalizeText(priceCurrency).toUpperCase() || asset.currency;
  if (responseCurrency !== asset.currency) {
    normalizedPrice = convertAmount(normalizedPrice, responseCurrency, asset.currency);
  }

  return {
    id: asset.id,
    price: normalizedPrice,
    quote_symbol: quoteSymbol || asset.quote_symbol || suggestQuoteSymbol(asset),
    price_source: "Gemini Google Search",
    price_updated_at: new Date().toISOString(),
    price_status: "live",
    quote_error: "",
    updated_at: new Date().toISOString(),
  };
}

export const DEFAULT_MARKET_DATA_CONFIG = {
  stockProvider: "Gemini Google Search",
  stockQuotesEnabled: false,
  cryptoProvider: "Gemini Google Search",
  cryptoQuotesEnabled: false,
  autoRefreshMinutes: AUTO_REFRESH_MINUTES,
  model: "gemini-2.5-flash-lite",
};

export function supportsAutoPricing(asset, pricingEnabled = false) {
  return pricingEnabled && !isCashAsset(asset);
}

export function suggestQuoteSymbol(asset) {
  if (isCashAsset(asset)) {
    return "";
  }

  if (isCryptoAsset(asset)) {
    return getCryptoQuoteId(asset);
  }

  return getPreferredSecuritySymbol(asset);
}

export async function refreshAssetsMarketPrices(assets, options = {}) {
  const { enabled = false } = options;

  if (!enabled) {
    return {
      updates: [],
      warnings: assets.map((asset) => ({
        assetId: asset.id,
        message: "Gemini serverless 尚未啟用，未能自動查價。",
      })),
      refreshedAt: new Date().toISOString(),
    };
  }

  const eligibleAssets = assets.filter((asset) => !isCashAsset(asset));
  const responseItems = await quoteAssetsWithGemini(
    eligibleAssets.map((asset) => ({
      ...asset,
      quote_symbol: asset.quote_symbol || suggestQuoteSymbol(asset),
    })),
  );

  const byId = new Map(eligibleAssets.map((asset) => [asset.id, asset]));
  const updates = [];
  const warnings = [];

  for (const item of responseItems) {
    const asset = byId.get(item.id);
    if (!asset) {
      continue;
    }

    if (item.latest_price == null) {
      warnings.push({
        assetId: asset.id,
        message: item.reason || `Gemini 未能可靠找到 ${asset.symbol || asset.name} 的最新價格。`,
      });
      continue;
    }

    const fields = buildQuoteFields(asset, {
      latestPrice: item.latest_price,
      priceCurrency: item.price_currency,
      quoteSymbol: item.quote_symbol,
    });

    if (!fields) {
      warnings.push({
        assetId: asset.id,
        message: `Gemini 回傳的 ${asset.symbol || asset.name} 價格格式無效。`,
      });
      continue;
    }

    updates.push(fields);
  }

  const updatedIds = new Set(updates.map((item) => item.id));
  for (const asset of eligibleAssets) {
    if (!updatedIds.has(asset.id) && !responseItems.find((item) => item.id === asset.id)) {
      warnings.push({
        assetId: asset.id,
        message: `Gemini 未回傳 ${asset.symbol || asset.name} 的價格結果。`,
      });
    }
  }

  return {
    updates,
    warnings,
    refreshedAt: new Date().toISOString(),
  };
}
