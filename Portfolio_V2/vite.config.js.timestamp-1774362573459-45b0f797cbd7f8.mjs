// vite.config.js
import { defineConfig, loadEnv } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/vite/dist/node/index.js";
import react from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/@vitejs/plugin-react/dist/index.js";

// src/lib/api/mockFunctionResponses.ts
function buildHealthResponse() {
  return {
    ok: true,
    route: "/api/health",
    mode: "mock",
    service: "portfolio-v2-functions",
    version: "stage-4-skeleton",
    timestamp: "2026-03-23T18:45:00+08:00"
  };
}

// server/analyzePortfolio.ts
import { GoogleGenAI } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/@google/genai/dist/node/index.mjs";
var ANALYZE_ROUTE = "/api/analyze";
var DEFAULT_ANALYZE_MODEL = "gemini-3.1-pro-preview";
var AnalyzePortfolioError = class extends Error {
  status;
  constructor(message, status = 500) {
    super(message);
    this.name = "AnalyzePortfolioError";
    this.status = status;
  }
};
function getAnalyzeModel() {
  return process.env.GEMINI_ANALYZE_MODEL?.trim() || DEFAULT_ANALYZE_MODEL;
}
function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalyzePortfolioError(
      "\u672A\u8A2D\u5B9A GEMINI_API_KEY \u6216 GOOGLE_API_KEY\uFF0C\u66AB\u6642\u7121\u6CD5\u5206\u6790\u6295\u8CC7\u7D44\u5408\u3002",
      500
    );
  }
  return apiKey;
}
function sanitizeString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
function sanitizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function sanitizeAssetType(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "stock") return "stock";
  if (normalized === "etf") return "etf";
  if (normalized === "bond") return "bond";
  if (normalized === "crypto") return "crypto";
  if (normalized === "cash") return "cash";
  return null;
}
function sanitizeStringList(value, minimumItems) {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 5);
  return items.length >= minimumItems ? items : null;
}
function normalizeAnalysisRequest(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new AnalyzePortfolioError("\u6295\u8CC7\u7D44\u5408\u5206\u6790\u8ACB\u6C42\u683C\u5F0F\u4E0D\u6B63\u78BA\u3002", 400);
  }
  const value = payload;
  const snapshotHash = sanitizeString(value.snapshotHash);
  const assetCount = sanitizeNumber(value.assetCount);
  const totalValueHKD = sanitizeNumber(value.totalValueHKD);
  const totalCostHKD = sanitizeNumber(value.totalCostHKD);
  if (!snapshotHash) {
    throw new AnalyzePortfolioError("\u7F3A\u5C11\u6295\u8CC7\u7D44\u5408\u5FEB\u7167\u8B58\u5225\u78BC\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66\u3002", 400);
  }
  if (!Array.isArray(value.holdings) || value.holdings.length === 0) {
    throw new AnalyzePortfolioError("\u76EE\u524D\u6C92\u6709\u53EF\u5206\u6790\u7684\u8CC7\u7522\u3002", 400);
  }
  const holdings = value.holdings.map((item) => {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const asset = item;
    const id = sanitizeString(asset.id);
    const name = sanitizeString(asset.name);
    const ticker = sanitizeString(asset.ticker);
    const assetType = sanitizeAssetType(asset.assetType);
    const accountSource = sanitizeString(asset.accountSource);
    const currency = sanitizeString(asset.currency);
    const quantity = sanitizeNumber(asset.quantity);
    const averageCost = sanitizeNumber(asset.averageCost);
    const currentPrice = sanitizeNumber(asset.currentPrice);
    const marketValue = sanitizeNumber(asset.marketValue);
    const costValue = sanitizeNumber(asset.costValue);
    if (!id || !name || !ticker || !assetType || !accountSource || !currency || quantity == null || averageCost == null || currentPrice == null || marketValue == null || costValue == null) {
      return null;
    }
    return {
      id,
      name,
      ticker,
      assetType,
      accountSource,
      currency: currency.toUpperCase(),
      quantity,
      averageCost,
      currentPrice,
      marketValue,
      costValue
    };
  }).filter((item) => item !== null);
  if (holdings.length === 0) {
    throw new AnalyzePortfolioError("\u76EE\u524D\u6C92\u6709\u5B8C\u6574\u7684\u8CC7\u7522\u8CC7\u6599\u53EF\u5206\u6790\u3002", 400);
  }
  const allocationsByType = Array.isArray(value.allocationsByType) ? value.allocationsByType.map((item) => {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const allocation = item;
    const assetType = sanitizeAssetType(allocation.assetType);
    const percentage = sanitizeNumber(allocation.percentage);
    const bucketTotal = sanitizeNumber(allocation.totalValueHKD);
    if (!assetType || percentage == null || bucketTotal == null) {
      return null;
    }
    return {
      assetType,
      percentage,
      totalValueHKD: bucketTotal
    };
  }).filter(
    (item) => item !== null
  ) : [];
  const allocationsByCurrency = Array.isArray(value.allocationsByCurrency) ? value.allocationsByCurrency.map((item) => {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const allocation = item;
    const currency = sanitizeString(allocation.currency);
    const percentage = sanitizeNumber(allocation.percentage);
    const bucketTotal = sanitizeNumber(allocation.totalValueHKD);
    if (!currency || percentage == null || bucketTotal == null) {
      return null;
    }
    return {
      currency: currency.toUpperCase(),
      percentage,
      totalValueHKD: bucketTotal
    };
  }).filter(
    (item) => item !== null
  ) : [];
  return {
    snapshotHash,
    assetCount: assetCount ?? holdings.length,
    totalValueHKD: totalValueHKD ?? 0,
    totalCostHKD: totalCostHKD ?? 0,
    holdings,
    allocationsByType,
    allocationsByCurrency
  };
}
function stripJsonFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}
function parseModelJson(text) {
  try {
    return JSON.parse(stripJsonFence(text));
  } catch {
    throw new AnalyzePortfolioError("Gemini \u672A\u56DE\u50B3\u53EF\u89E3\u6790\u7684\u5206\u6790 JSON\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002", 502);
  }
}
function sanitizeAnalysisResult(rawPayload) {
  if (typeof rawPayload !== "object" || rawPayload === null) {
    throw new AnalyzePortfolioError("Gemini \u56DE\u50B3\u683C\u5F0F\u4E0D\u6B63\u78BA\u3002", 502);
  }
  const value = rawPayload;
  const summary = sanitizeString(value.summary);
  const topRisks = sanitizeStringList(value.topRisks, 1);
  const allocationInsights = sanitizeStringList(value.allocationInsights, 1);
  const currencyExposure = sanitizeStringList(value.currencyExposure, 1);
  const nextQuestions = sanitizeStringList(value.nextQuestions, 1);
  if (!summary || !topRisks || !allocationInsights || !currencyExposure || !nextQuestions) {
    throw new AnalyzePortfolioError("Gemini \u56DE\u50B3\u6B04\u4F4D\u4E0D\u5B8C\u6574\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002", 502);
  }
  return {
    summary,
    topRisks,
    allocationInsights,
    currencyExposure,
    nextQuestions
  };
}
function buildPrompt(request) {
  return `
You are a portfolio analysis assistant.

Analyze ONLY the portfolio snapshot provided below.
Return ONLY raw JSON. Do not use markdown fences. Do not add any explanation outside JSON.

Use this exact schema:
{
  "summary": string,
  "topRisks": string[],
  "allocationInsights": string[],
  "currencyExposure": string[],
  "nextQuestions": string[]
}

Rules:
- Write all output in Traditional Chinese.
- Base your reasoning only on the provided holdings, latest prices, asset categories, currencies, and average costs.
- Do not invent historical returns, dividends, macro news, or external facts that are not present in the input.
- summary should be 2 to 4 sentences and should explicitly mention the biggest allocation or concentration pattern.
- topRisks should contain 3 to 5 short bullets about concentration, diversification gaps, liquidity, or data limitations.
- allocationInsights should contain 3 to 5 concrete observations tied to the actual asset type weights or cost structure.
- currencyExposure should contain 2 to 4 short bullets about HKD/USD or other visible currency concentration.
- nextQuestions should contain 3 to 5 short, actionable follow-up questions the user may want to ask next.
- If the data lacks price history or cash-flow history, mention that limitation briefly where relevant.
- Keep the tone practical, calm, and beginner-friendly.

Portfolio snapshot:
${JSON.stringify(request, null, 2)}
  `.trim();
}
var responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "topRisks",
    "allocationInsights",
    "currencyExposure",
    "nextQuestions"
  ],
  properties: {
    summary: { type: "string" },
    topRisks: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    },
    allocationInsights: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    },
    currencyExposure: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    },
    nextQuestions: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    }
  }
};
function getAnalyzePortfolioErrorResponse(error) {
  if (error instanceof AnalyzePortfolioError) {
    return {
      status: error.status,
      body: {
        ok: false,
        route: ANALYZE_ROUTE,
        message: error.message
      }
    };
  }
  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        ok: false,
        route: ANALYZE_ROUTE,
        message: error.message
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      route: ANALYZE_ROUTE,
      message: "\u6295\u8CC7\u7D44\u5408\u5206\u6790\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002"
    }
  };
}
async function analyzePortfolio(payload) {
  const request = normalizeAnalysisRequest(payload);
  const apiKey = getGeminiApiKey();
  const model = getAnalyzeModel();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(request);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseJsonSchema
    }
  });
  const raw = parseModelJson(response.text ?? "");
  const result = sanitizeAnalysisResult(raw);
  return {
    ok: true,
    route: ANALYZE_ROUTE,
    mode: "live",
    model,
    snapshotHash: request.snapshotHash,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...result
  };
}

// server/extractAssets.ts
import { GoogleGenAI as GoogleGenAI2 } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/@google/genai/dist/node/index.mjs";
var EXTRACT_ROUTE = "/api/extract-assets";
var DEFAULT_EXTRACT_MODEL = "gemini-3.1-flash-lite";
var ExtractAssetsError = class extends Error {
  status;
  constructor(message, status = 500) {
    super(message);
    this.name = "ExtractAssetsError";
    this.status = status;
  }
};
function getExtractModel() {
  return process.env.GEMINI_EXTRACT_MODEL?.trim() || DEFAULT_EXTRACT_MODEL;
}
function getGeminiApiKey2() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new ExtractAssetsError(
      "\u672A\u8A2D\u5B9A GEMINI_API_KEY \u6216 GOOGLE_API_KEY\uFF0C\u66AB\u6642\u7121\u6CD5\u89E3\u6790\u622A\u5716\u3002",
      500
    );
  }
  return apiKey;
}
function normalizeExtractAssetsRequest(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new ExtractAssetsError("\u622A\u5716\u89E3\u6790\u8ACB\u6C42\u683C\u5F0F\u4E0D\u6B63\u78BA\u3002", 400);
  }
  const value = payload;
  const fileName = typeof value.fileName === "string" ? value.fileName.trim() : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim() : "";
  const imageBase64 = typeof value.imageBase64 === "string" ? value.imageBase64.trim() : "";
  if (!fileName || !mimeType || !imageBase64) {
    throw new ExtractAssetsError("\u7F3A\u5C11\u5FC5\u8981\u7684\u622A\u5716\u8CC7\u6599\uFF0C\u8ACB\u91CD\u65B0\u4E0A\u50B3\u5716\u7247\u3002", 400);
  }
  return {
    fileName,
    mimeType,
    imageBase64
  };
}
function sanitizeString2(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
function sanitizeNumber2(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function sanitizeType(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "stock" || normalized === "stocks" || normalized === "equity") {
    return "stock";
  }
  if (normalized === "etf") {
    return "etf";
  }
  if (normalized === "bond" || normalized === "bonds" || normalized === "fixed income") {
    return "bond";
  }
  if (normalized === "crypto" || normalized === "cryptocurrency" || normalized === "coin") {
    return "crypto";
  }
  if (normalized === "cash") {
    return "cash";
  }
  return null;
}
function sanitizeCurrency(value) {
  const normalized = sanitizeString2(value);
  return normalized ? normalized.toUpperCase() : null;
}
function sanitizeExtractedAssets(rawPayload) {
  if (typeof rawPayload !== "object" || rawPayload === null || !("assets" in rawPayload) || !Array.isArray(rawPayload.assets)) {
    throw new ExtractAssetsError("Gemini \u56DE\u50B3\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u672A\u627E\u5230 assets \u9663\u5217\u3002", 502);
  }
  return rawPayload.assets.map((asset) => {
    const value = typeof asset === "object" && asset !== null ? asset : {};
    return {
      name: sanitizeString2(value.name),
      ticker: sanitizeString2(value.ticker),
      type: sanitizeType(value.type),
      quantity: sanitizeNumber2(value.quantity),
      currency: sanitizeCurrency(value.currency),
      costBasis: sanitizeNumber2(value.costBasis)
    };
  });
}
function stripJsonFence2(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}
function parseGeminiJson(text) {
  const normalized = stripJsonFence2(text);
  try {
    return JSON.parse(normalized);
  } catch {
    throw new ExtractAssetsError("Gemini \u672A\u56DE\u50B3\u53EF\u89E3\u6790\u7684 JSON\uFF0C\u8ACB\u63DB\u4E00\u5F35\u66F4\u6E05\u6670\u7684\u622A\u5716\u518D\u8A66\u3002", 502);
  }
}
function buildExtractionPrompt(fileName) {
  return `
You are extracting portfolio holdings from a brokerage or wallet screenshot.

Return ONLY raw JSON. Do not use markdown fences. Do not add any explanation.

Use this exact shape:
{
  "assets": [
    {
      "name": string | null,
      "ticker": string | null,
      "type": "stock" | "etf" | "bond" | "crypto" | "cash" | null,
      "quantity": number | null,
      "currency": string | null,
      "costBasis": number | null
    }
  ]
}

Rules:
- Extract only assets that are actually visible in the screenshot.
- If a field is not visible or uncertain, set it to null.
- "costBasis" means average cost per unit, not total cost.
- "currency" should be an uppercase currency code like HKD or USD when visible.
- "type" must be one of: stock, etf, bond, crypto, cash, or null.
- Keep numbers as JSON numbers, not strings.
- Do not include fields outside the fixed schema.

Screenshot filename: ${fileName}
  `.trim();
}
function getExtractAssetsErrorResponse(error) {
  if (error instanceof ExtractAssetsError) {
    return {
      status: error.status,
      body: {
        ok: false,
        route: EXTRACT_ROUTE,
        message: error.message
      }
    };
  }
  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        ok: false,
        route: EXTRACT_ROUTE,
        message: error.message
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      route: EXTRACT_ROUTE,
      message: "\u622A\u5716\u89E3\u6790\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002"
    }
  };
}
async function extractAssetsFromScreenshot(payload) {
  const normalizedPayload = normalizeExtractAssetsRequest(payload);
  const apiKey = getGeminiApiKey2();
  const ai = new GoogleGenAI2({ apiKey });
  const model = getExtractModel();
  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        text: buildExtractionPrompt(normalizedPayload.fileName)
      },
      {
        inlineData: {
          mimeType: normalizedPayload.mimeType,
          data: normalizedPayload.imageBase64
        }
      }
    ],
    config: {
      temperature: 0.1
    }
  });
  const parsed = parseGeminiJson(result.text ?? "");
  const assets = sanitizeExtractedAssets(parsed);
  return {
    ok: true,
    route: EXTRACT_ROUTE,
    mode: "live",
    model,
    assets
  };
}

// server/updatePrices.ts
import { GoogleGenAI as GoogleGenAI3 } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/@google/genai/dist/node/index.mjs";
var UPDATE_PRICES_ROUTE = "/api/update-prices";
var DEFAULT_PRICE_MODEL = "gemini-3.1-flash-lite";
var DEFAULT_REVIEW_THRESHOLD = 0.15;
var UpdatePricesError = class extends Error {
  status;
  constructor(message, status = 500) {
    super(message);
    this.name = "UpdatePricesError";
    this.status = status;
  }
};
function getPriceUpdateModel() {
  return process.env.GEMINI_PRICE_UPDATE_MODEL?.trim() || DEFAULT_PRICE_MODEL;
}
function getReviewThreshold() {
  const raw = Number(process.env.PRICE_UPDATE_REVIEW_THRESHOLD_PCT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REVIEW_THRESHOLD;
}
function getGeminiApiKey3() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new UpdatePricesError(
      "\u672A\u8A2D\u5B9A GEMINI_API_KEY \u6216 GOOGLE_API_KEY\uFF0C\u66AB\u6642\u7121\u6CD5\u57F7\u884C AI \u50F9\u683C\u66F4\u65B0\u3002",
      500
    );
  }
  return apiKey;
}
function normalizeRequest(payload) {
  if (typeof payload !== "object" || payload === null || !("assets" in payload) || !Array.isArray(payload.assets)) {
    throw new UpdatePricesError("\u50F9\u683C\u66F4\u65B0\u8ACB\u6C42\u683C\u5F0F\u4E0D\u6B63\u78BA\u3002", 400);
  }
  const assets = payload.assets.map((asset) => normalizeRequestAsset(asset)).filter((asset) => asset !== null);
  if (assets.length === 0) {
    throw new UpdatePricesError("\u672A\u63D0\u4F9B\u53EF\u66F4\u65B0\u7684\u8CC7\u7522\u3002", 400);
  }
  return { assets };
}
function normalizeRequestAsset(asset) {
  if (typeof asset !== "object" || asset === null) {
    return null;
  }
  const value = asset;
  if (typeof value.assetId !== "string" || typeof value.assetName !== "string" || typeof value.ticker !== "string" || typeof value.assetType !== "string" || typeof value.currentPrice !== "number" || typeof value.currency !== "string") {
    return null;
  }
  return {
    assetId: value.assetId,
    assetName: value.assetName,
    ticker: value.ticker,
    assetType: normalizeAssetType(value.assetType),
    currentPrice: value.currentPrice,
    currency: value.currency.trim().toUpperCase()
  };
}
function normalizeAssetType(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "stock") return "stock";
  if (normalized === "etf") return "etf";
  if (normalized === "bond") return "bond";
  if (normalized === "crypto") return "crypto";
  return "cash";
}
function sanitizeString3(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
function sanitizeNumber3(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function sanitizeAssetType2(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "stock") return "stock";
  if (normalized === "etf") return "etf";
  if (normalized === "bond") return "bond";
  if (normalized === "crypto") return "crypto";
  if (normalized === "cash") return "cash";
  return null;
}
function sanitizeConfidence(value) {
  const parsed = sanitizeNumber3(value);
  if (parsed == null) {
    return null;
  }
  return Math.min(Math.max(parsed, 0), 1);
}
function stripJsonFence3(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}
function parseModelJson2(text) {
  try {
    return JSON.parse(stripJsonFence3(text));
  } catch {
    throw new UpdatePricesError("Gemini \u672A\u56DE\u50B3\u53EF\u89E3\u6790\u7684 JSON\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002", 502);
  }
}
function sanitizePriceUpdateResults(rawPayload) {
  if (typeof rawPayload !== "object" || rawPayload === null || !("results" in rawPayload) || !Array.isArray(rawPayload.results)) {
    throw new UpdatePricesError("Gemini \u56DE\u50B3\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u672A\u627E\u5230 results \u9663\u5217\u3002", 502);
  }
  return rawPayload.results.map((item) => {
    const value = typeof item === "object" && item !== null ? item : {};
    return {
      assetName: sanitizeString3(value.assetName),
      ticker: sanitizeString3(value.ticker),
      assetType: sanitizeAssetType2(value.assetType),
      price: sanitizeNumber3(value.price),
      currency: sanitizeString3(value.currency)?.toUpperCase() ?? null,
      asOf: sanitizeString3(value.asOf),
      sourceName: sanitizeString3(value.sourceName),
      sourceUrl: sanitizeString3(value.sourceUrl),
      confidence: sanitizeConfidence(value.confidence),
      needsReview: Boolean(value.needsReview)
    };
  });
}
function buildPrompt2(assets) {
  return `
You are an AI price update assistant.

Return ONLY raw JSON. Do not use markdown fences. Do not include any explanation.

Use this exact schema:
{
  "results": [
    {
      "assetName": string,
      "ticker": string,
      "assetType": "stock" | "etf" | "bond" | "crypto" | "cash",
      "price": number,
      "currency": string,
      "asOf": string,
      "sourceName": string,
      "sourceUrl": string,
      "confidence": number,
      "needsReview": boolean
    }
  ]
}

Rules:
- Return exactly one result for each input asset.
- Keep assetName, ticker, assetType, and currency aligned with the input asset unless a correction is clearly needed.
- price must be the latest reasonable market price per unit.
- asOf must be an ISO-8601 datetime string if possible.
- sourceName should identify the source used.
- sourceUrl should be a direct source URL when possible.
- confidence must be between 0 and 1.
- needsReview should be true if the result is uncertain, stale, source is weak, or price may be unreliable.
- No extra fields.

Input assets:
${JSON.stringify(assets, null, 2)}
  `.trim();
}
var responseJsonSchema2 = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "assetName",
          "ticker",
          "assetType",
          "price",
          "currency",
          "asOf",
          "sourceName",
          "sourceUrl",
          "confidence",
          "needsReview"
        ],
        properties: {
          assetName: { type: "string" },
          ticker: { type: "string" },
          assetType: { type: "string", enum: ["stock", "etf", "bond", "crypto", "cash"] },
          price: { type: "number" },
          currency: { type: "string" },
          asOf: { type: "string" },
          sourceName: { type: "string" },
          sourceUrl: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          needsReview: { type: "boolean" }
        }
      }
    }
  }
};
async function generatePriceResponseWithFallback(ai, model, prompt) {
  try {
    return await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchema2,
        tools: [{ googleSearch: {} }]
      }
    });
  } catch {
    return ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchema2
      }
    });
  }
}
function buildReviewResults(requestedAssets, modelResults) {
  const threshold = getReviewThreshold();
  return requestedAssets.map((asset, index) => {
    const matched = modelResults.find(
      (item) => item.ticker?.toUpperCase() === asset.ticker.toUpperCase() || item.assetName?.toLowerCase() === asset.assetName.toLowerCase()
    ) ?? modelResults[index];
    const nextPrice = matched?.price ?? null;
    const diffPct = nextPrice != null && asset.currentPrice > 0 ? Math.abs(nextPrice - asset.currentPrice) / asset.currentPrice : 0;
    const forcedNeedsReview = nextPrice == null || nextPrice <= 0 || diffPct >= threshold || !matched?.sourceName || !matched?.sourceUrl || (matched?.confidence ?? 0) < 0.75;
    return {
      id: asset.assetId,
      assetId: asset.assetId,
      assetName: matched?.assetName ?? asset.assetName,
      ticker: matched?.ticker?.toUpperCase() ?? asset.ticker.toUpperCase(),
      assetType: matched?.assetType ?? asset.assetType,
      price: nextPrice,
      currency: matched?.currency?.toUpperCase() ?? asset.currency,
      asOf: matched?.asOf ?? (/* @__PURE__ */ new Date()).toISOString(),
      sourceName: matched?.sourceName ?? "",
      sourceUrl: matched?.sourceUrl ?? "",
      confidence: matched?.confidence ?? 0,
      needsReview: Boolean(matched?.needsReview) || forcedNeedsReview,
      currentPrice: asset.currentPrice,
      diffPct,
      status: "pending"
    };
  });
}
function getUpdatePricesErrorResponse(error) {
  if (error instanceof UpdatePricesError) {
    return {
      status: error.status,
      body: {
        ok: false,
        route: UPDATE_PRICES_ROUTE,
        message: error.message
      }
    };
  }
  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        ok: false,
        route: UPDATE_PRICES_ROUTE,
        message: error.message
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      route: UPDATE_PRICES_ROUTE,
      message: "AI \u50F9\u683C\u66F4\u65B0\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002"
    }
  };
}
async function generatePriceUpdates(payload) {
  const request = normalizeRequest(payload);
  const apiKey = getGeminiApiKey3();
  const model = getPriceUpdateModel();
  const ai = new GoogleGenAI3({ apiKey });
  const prompt = buildPrompt2(request.assets);
  const response = await generatePriceResponseWithFallback(ai, model, prompt);
  const raw = parseModelJson2(response.text ?? "");
  const sanitizedResults = sanitizePriceUpdateResults(raw);
  const results = buildReviewResults(request.assets, sanitizedResults);
  return {
    ok: true,
    route: UPDATE_PRICES_ROUTE,
    mode: "live",
    model,
    results
  };
}

// server/firebaseAdmin.ts
import { cert, getApp, getApps, initializeApp } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/firebase-admin/lib/esm/app/index.js";
import { getAuth } from "file:///Users/yinwaiyeung/Documents/Playground/Portfolio_V2/node_modules/firebase-admin/lib/esm/auth/index.js";
var ADMIN_ENV_KEYS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY"
];
function normalizePrivateKey(value) {
  return value.replace(/\\n/g, "\n").trim();
}
function readServiceAccountFromJson() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON \u4E0D\u662F\u6709\u6548\u7684 JSON\u3002");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON \u683C\u5F0F\u4E0D\u6B63\u78BA\u3002");
  }
  const value = parsed;
  const projectId = typeof value.project_id === "string" ? value.project_id.trim() : typeof value.projectId === "string" ? value.projectId.trim() : "";
  const clientEmail = typeof value.client_email === "string" ? value.client_email.trim() : typeof value.clientEmail === "string" ? value.clientEmail.trim() : "";
  const privateKey = typeof value.private_key === "string" ? normalizePrivateKey(value.private_key) : typeof value.privateKey === "string" ? normalizePrivateKey(value.privateKey) : "";
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON \u7F3A\u5C11 project_id\u3001client_email \u6216 private_key\u3002"
    );
  }
  return {
    projectId,
    clientEmail,
    privateKey
  };
}
function readServiceAccountFromEnv() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim() || "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "");
  if (!projectId && !clientEmail && !privateKey) {
    return null;
  }
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin \u8A2D\u5B9A\u4E0D\u5B8C\u6574\u3002\u8ACB\u88DC\u4E0A ${ADMIN_ENV_KEYS.join("\u3001")}\uFF0C\u6216\u6539\u7528 FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON\u3002`
    );
  }
  return {
    projectId,
    clientEmail,
    privateKey
  };
}
function getFirebaseAdminServiceAccount() {
  return readServiceAccountFromJson() ?? readServiceAccountFromEnv();
}
function getFirebaseAdminSetupErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return `\u672A\u8A2D\u5B9A Firebase Admin \u6191\u8B49\u3002\u8ACB\u8A2D\u5B9A FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON\uFF0C\u6216 ${ADMIN_ENV_KEYS.join("\u3001")}\u3002`;
}
function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  const serviceAccount = getFirebaseAdminServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      `\u672A\u8A2D\u5B9A Firebase Admin \u6191\u8B49\u3002\u8ACB\u8A2D\u5B9A FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON\uFF0C\u6216 ${ADMIN_ENV_KEYS.join("\u3001")}\u3002`
    );
  }
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId
  });
}
async function verifyFirebaseIdToken(idToken) {
  const auth = getAuth(getFirebaseAdminApp());
  return auth.verifyIdToken(idToken);
}

// server/requireFirebaseUser.ts
var FirebaseApiAuthError = class extends Error {
  status;
  route;
  constructor(message, route, status = 401) {
    super(message);
    this.name = "FirebaseApiAuthError";
    this.status = status;
    this.route = route;
  }
};
function isFirebaseApiAuthError(error) {
  return error instanceof FirebaseApiAuthError;
}
function getBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    throw new Error("MISSING_AUTH_HEADER");
  }
  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("INVALID_AUTH_HEADER");
  }
  return token;
}
function getNodeAuthorizationHeader(request) {
  const header = request.headers.authorization;
  if (Array.isArray(header)) {
    return header[0] ?? null;
  }
  return header ?? null;
}
async function requireFirebaseUserFromAuthorizationHeader(authorizationHeader, route) {
  let token = "";
  try {
    token = getBearerToken(authorizationHeader);
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_AUTH_HEADER") {
      throw new FirebaseApiAuthError("\u7F3A\u5C11 Firebase ID token\uFF0C\u8ACB\u91CD\u65B0\u767B\u5165\u5F8C\u518D\u8A66\u3002", route, 401);
    }
    throw new FirebaseApiAuthError(
      "Authorization header \u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u4F7F\u7528 Bearer token\u3002",
      route,
      401
    );
  }
  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    const setupMessage = getFirebaseAdminSetupErrorMessage(error);
    if (setupMessage.includes("\u672A\u8A2D\u5B9A Firebase Admin \u6191\u8B49") || setupMessage.includes("Firebase Admin \u8A2D\u5B9A\u4E0D\u5B8C\u6574") || setupMessage.includes("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON")) {
      throw new FirebaseApiAuthError(setupMessage, route, 500);
    }
    throw new FirebaseApiAuthError("Firebase ID token \u9A57\u8B49\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66\u3002", route, 401);
  }
}
async function requireFirebaseUserFromNodeRequest(request, route) {
  return requireFirebaseUserFromAuthorizationHeader(getNodeAuthorizationHeader(request), route);
}
function getFirebaseApiAuthErrorResponse(error, route) {
  if (error instanceof FirebaseApiAuthError) {
    return {
      status: error.status,
      body: {
        ok: false,
        route,
        message: error.message
      }
    };
  }
  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        ok: false,
        route,
        message: error.message
      }
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      route,
      message: "Firebase \u9A57\u8B49\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002"
    }
  };
}

// vite.config.js
function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload, null, 2));
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);
  return {
    plugins: [
      react(),
      {
        name: "local-api-mocks",
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
            const pathname = request.url?.split("?")[0];
            if (request.method === "GET" && pathname === "/api/health") {
              sendJson(response, 200, buildHealthResponse());
              return;
            }
            if (request.method === "POST" && pathname === "/api/extract-assets") {
              try {
                await requireFirebaseUserFromNodeRequest(request, "/api/extract-assets");
                const body = await readJsonBody(request);
                const result = await extractAssetsFromScreenshot(body);
                sendJson(response, 200, result);
              } catch (error) {
                if (isFirebaseApiAuthError(error)) {
                  const authError = getFirebaseApiAuthErrorResponse(error, "/api/extract-assets");
                  sendJson(response, authError.status, authError.body);
                  return;
                }
                const formatted = getExtractAssetsErrorResponse(error);
                sendJson(response, formatted.status, formatted.body);
              }
              return;
            }
            if (request.method === "POST" && pathname === "/api/update-prices") {
              try {
                await requireFirebaseUserFromNodeRequest(request, "/api/update-prices");
                const body = await readJsonBody(request);
                const result = await generatePriceUpdates(body);
                sendJson(response, 200, result);
              } catch (error) {
                if (isFirebaseApiAuthError(error)) {
                  const authError = getFirebaseApiAuthErrorResponse(error, "/api/update-prices");
                  sendJson(response, authError.status, authError.body);
                  return;
                }
                const formatted = getUpdatePricesErrorResponse(error);
                sendJson(response, formatted.status, formatted.body);
              }
              return;
            }
            if (request.method === "POST" && pathname === "/api/analyze") {
              try {
                await requireFirebaseUserFromNodeRequest(request, "/api/analyze");
                const body = await readJsonBody(request);
                const result = await analyzePortfolio(body);
                sendJson(response, 200, result);
              } catch (error) {
                if (isFirebaseApiAuthError(error)) {
                  const authError = getFirebaseApiAuthErrorResponse(error, "/api/analyze");
                  sendJson(response, authError.status, authError.body);
                  return;
                }
                const formatted = getAnalyzePortfolioErrorResponse(error);
                sendJson(response, formatted.status, formatted.body);
              }
              return;
            }
            next();
          });
        }
      }
    ]
  };
});
async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }
  return JSON.parse(rawBody);
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAic3JjL2xpYi9hcGkvbW9ja0Z1bmN0aW9uUmVzcG9uc2VzLnRzIiwgInNlcnZlci9hbmFseXplUG9ydGZvbGlvLnRzIiwgInNlcnZlci9leHRyYWN0QXNzZXRzLnRzIiwgInNlcnZlci91cGRhdGVQcmljZXMudHMiLCAic2VydmVyL2ZpcmViYXNlQWRtaW4udHMiLCAic2VydmVyL3JlcXVpcmVGaXJlYmFzZVVzZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBidWlsZEhlYWx0aFJlc3BvbnNlLCB9IGZyb20gJy4vc3JjL2xpYi9hcGkvbW9ja0Z1bmN0aW9uUmVzcG9uc2VzJztcbmltcG9ydCB7IGFuYWx5emVQb3J0Zm9saW8sIGdldEFuYWx5emVQb3J0Zm9saW9FcnJvclJlc3BvbnNlLCB9IGZyb20gJy4vc2VydmVyL2FuYWx5emVQb3J0Zm9saW8nO1xuaW1wb3J0IHsgZXh0cmFjdEFzc2V0c0Zyb21TY3JlZW5zaG90LCBnZXRFeHRyYWN0QXNzZXRzRXJyb3JSZXNwb25zZSwgfSBmcm9tICcuL3NlcnZlci9leHRyYWN0QXNzZXRzJztcbmltcG9ydCB7IGdlbmVyYXRlUHJpY2VVcGRhdGVzLCBnZXRVcGRhdGVQcmljZXNFcnJvclJlc3BvbnNlLCB9IGZyb20gJy4vc2VydmVyL3VwZGF0ZVByaWNlcyc7XG5pbXBvcnQgeyBnZXRGaXJlYmFzZUFwaUF1dGhFcnJvclJlc3BvbnNlLCBpc0ZpcmViYXNlQXBpQXV0aEVycm9yLCByZXF1aXJlRmlyZWJhc2VVc2VyRnJvbU5vZGVSZXF1ZXN0LCB9IGZyb20gJy4vc2VydmVyL3JlcXVpcmVGaXJlYmFzZVVzZXInO1xuZnVuY3Rpb24gc2VuZEpzb24ocmVzcG9uc2UsIHN0YXR1c0NvZGUsIHBheWxvYWQpIHtcbiAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gc3RhdHVzQ29kZTtcbiAgICByZXNwb25zZS5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04Jyk7XG4gICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHBheWxvYWQsIG51bGwsIDIpKTtcbn1cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcbiAgICBPYmplY3QuYXNzaWduKHByb2Nlc3MuZW52LCBlbnYpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHJlYWN0KCksXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2xvY2FsLWFwaS1tb2NrcycsXG4gICAgICAgICAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFzeW5jIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aG5hbWUgPSByZXF1ZXN0LnVybD8uc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0Lm1ldGhvZCA9PT0gJ0dFVCcgJiYgcGF0aG5hbWUgPT09ICcvYXBpL2hlYWx0aCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kSnNvbihyZXNwb25zZSwgMjAwLCBidWlsZEhlYWx0aFJlc3BvbnNlKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0Lm1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGhuYW1lID09PSAnL2FwaS9leHRyYWN0LWFzc2V0cycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1aXJlRmlyZWJhc2VVc2VyRnJvbU5vZGVSZXF1ZXN0KHJlcXVlc3QsICcvYXBpL2V4dHJhY3QtYXNzZXRzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZWFkSnNvbkJvZHkocmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4dHJhY3RBc3NldHNGcm9tU2NyZWVuc2hvdChib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZEpzb24ocmVzcG9uc2UsIDIwMCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0ZpcmViYXNlQXBpQXV0aEVycm9yKGVycm9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aEVycm9yID0gZ2V0RmlyZWJhc2VBcGlBdXRoRXJyb3JSZXNwb25zZShlcnJvciwgJy9hcGkvZXh0cmFjdC1hc3NldHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRKc29uKHJlc3BvbnNlLCBhdXRoRXJyb3Iuc3RhdHVzLCBhdXRoRXJyb3IuYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gZ2V0RXh0cmFjdEFzc2V0c0Vycm9yUmVzcG9uc2UoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kSnNvbihyZXNwb25zZSwgZm9ybWF0dGVkLnN0YXR1cywgZm9ybWF0dGVkLmJvZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5tZXRob2QgPT09ICdQT1NUJyAmJiBwYXRobmFtZSA9PT0gJy9hcGkvdXBkYXRlLXByaWNlcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1aXJlRmlyZWJhc2VVc2VyRnJvbU5vZGVSZXF1ZXN0KHJlcXVlc3QsICcvYXBpL3VwZGF0ZS1wcmljZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHJlYWRKc29uQm9keShyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVQcmljZVVwZGF0ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRKc29uKHJlc3BvbnNlLCAyMDAsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNGaXJlYmFzZUFwaUF1dGhFcnJvcihlcnJvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1dGhFcnJvciA9IGdldEZpcmViYXNlQXBpQXV0aEVycm9yUmVzcG9uc2UoZXJyb3IsICcvYXBpL3VwZGF0ZS1wcmljZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRKc29uKHJlc3BvbnNlLCBhdXRoRXJyb3Iuc3RhdHVzLCBhdXRoRXJyb3IuYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gZ2V0VXBkYXRlUHJpY2VzRXJyb3JSZXNwb25zZShlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRKc29uKHJlc3BvbnNlLCBmb3JtYXR0ZWQuc3RhdHVzLCBmb3JtYXR0ZWQuYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0Lm1ldGhvZCA9PT0gJ1BPU1QnICYmIHBhdGhuYW1lID09PSAnL2FwaS9hbmFseXplJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVpcmVGaXJlYmFzZVVzZXJGcm9tTm9kZVJlcXVlc3QocmVxdWVzdCwgJy9hcGkvYW5hbHl6ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVhZEpzb25Cb2R5KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhbmFseXplUG9ydGZvbGlvKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kSnNvbihyZXNwb25zZSwgMjAwLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzRmlyZWJhc2VBcGlBdXRoRXJyb3IoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoRXJyb3IgPSBnZXRGaXJlYmFzZUFwaUF1dGhFcnJvclJlc3BvbnNlKGVycm9yLCAnL2FwaS9hbmFseXplJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kSnNvbihyZXNwb25zZSwgYXV0aEVycm9yLnN0YXR1cywgYXV0aEVycm9yLmJvZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGdldEFuYWx5emVQb3J0Zm9saW9FcnJvclJlc3BvbnNlKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZEpzb24ocmVzcG9uc2UsIGZvcm1hdHRlZC5zdGF0dXMsIGZvcm1hdHRlZC5ib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICB9O1xufSk7XG5hc3luYyBmdW5jdGlvbiByZWFkSnNvbkJvZHkocmVxdWVzdCkge1xuICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgcmVxdWVzdCkge1xuICAgICAgICBpZiAodHlwZW9mIGNodW5rID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oY2h1bmspKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICB9XG4gICAgY29uc3QgcmF3Qm9keSA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygndXRmOCcpLnRyaW0oKTtcbiAgICBpZiAoIXJhd0JvZHkpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICByZXR1cm4gSlNPTi5wYXJzZShyYXdCb2R5KTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zcmMvbGliL2FwaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zcmMvbGliL2FwaS9tb2NrRnVuY3Rpb25SZXNwb25zZXMudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zcmMvbGliL2FwaS9tb2NrRnVuY3Rpb25SZXNwb25zZXMudHNcIjtleHBvcnQgZnVuY3Rpb24gYnVpbGRIZWFsdGhSZXNwb25zZSgpIHtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByb3V0ZTogJy9hcGkvaGVhbHRoJyxcbiAgICBtb2RlOiAnbW9jaycsXG4gICAgc2VydmljZTogJ3BvcnRmb2xpby12Mi1mdW5jdGlvbnMnLFxuICAgIHZlcnNpb246ICdzdGFnZS00LXNrZWxldG9uJyxcbiAgICB0aW1lc3RhbXA6ICcyMDI2LTAzLTIzVDE4OjQ1OjAwKzA4OjAwJyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRXh0cmFjdEFzc2V0c1Jlc3BvbnNlKCkge1xuICByZXR1cm4ge1xuICAgIG9rOiB0cnVlLFxuICAgIHJvdXRlOiAnL2FwaS9leHRyYWN0LWFzc2V0cycsXG4gICAgbW9kZTogJ21vY2snLFxuICAgIHByb3ZpZGVyOiAnZGlzYWJsZWQnLFxuICAgIGpvYklkOiAnbW9jay1leHRyYWN0LTAwMScsXG4gICAgc3RhdHVzOiAncGFyc2VkJyxcbiAgICBjYW5kaWRhdGVzOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdUZW5jZW50IEhvbGRpbmdzJyxcbiAgICAgICAgc3ltYm9sOiAnMDcwMC5ISycsXG4gICAgICAgIGFzc2V0VHlwZTogJ3N0b2NrJyxcbiAgICAgICAgcXVhbnRpdHk6IDQyLFxuICAgICAgICBhdmVyYWdlQ29zdDogMzAyLjQsXG4gICAgICAgIGN1cnJlbmN5OiAnSEtEJyxcbiAgICAgICAgY29uZmlkZW5jZTogMC45NixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdBcHBsZScsXG4gICAgICAgIHN5bWJvbDogJ0FBUEwnLFxuICAgICAgICBhc3NldFR5cGU6ICdzdG9jaycsXG4gICAgICAgIHF1YW50aXR5OiAxNCxcbiAgICAgICAgYXZlcmFnZUNvc3Q6IDE4NC45LFxuICAgICAgICBjdXJyZW5jeTogJ1VTRCcsXG4gICAgICAgIGNvbmZpZGVuY2U6IDAuOTQsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnQml0Y29pbicsXG4gICAgICAgIHN5bWJvbDogJ0JUQycsXG4gICAgICAgIGFzc2V0VHlwZTogJ2NyeXB0bycsXG4gICAgICAgIHF1YW50aXR5OiAwLjAzLFxuICAgICAgICBhdmVyYWdlQ29zdDogNTYxMjAsXG4gICAgICAgIGN1cnJlbmN5OiAnVVNEJyxcbiAgICAgICAgY29uZmlkZW5jZTogMC45MSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXBkYXRlUHJpY2VzUmVzcG9uc2UoKSB7XG4gIHJldHVybiB7XG4gICAgb2s6IHRydWUsXG4gICAgcm91dGU6ICcvYXBpL3VwZGF0ZS1wcmljZXMnLFxuICAgIG1vZGU6ICdtb2NrJyxcbiAgICBwcm92aWRlcjogJ2Rpc2FibGVkJyxcbiAgICB1cGRhdGVkQXQ6ICcyMDI2LTAzLTIzVDE4OjQ2OjAwKzA4OjAwJyxcbiAgICBwcmljZXM6IFtcbiAgICAgIHsgc3ltYm9sOiAnMDcwMC5ISycsIGN1cnJlbmN5OiAnSEtEJywgcHJpY2U6IDMyOS40LCBzb3VyY2U6ICdtb2NrLWNoZWFwLW1vZGVsJyB9LFxuICAgICAgeyBzeW1ib2w6ICdBQVBMJywgY3VycmVuY3k6ICdVU0QnLCBwcmljZTogMTk5LjEsIHNvdXJjZTogJ21vY2stY2hlYXAtbW9kZWwnIH0sXG4gICAgICB7IHN5bWJvbDogJ0JUQycsIGN1cnJlbmN5OiAnVVNEJywgcHJpY2U6IDY0MjUwLCBzb3VyY2U6ICdtb2NrLWNoZWFwLW1vZGVsJyB9LFxuICAgIF0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFuYWx5emVSZXNwb25zZSgpIHtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByb3V0ZTogJy9hcGkvYW5hbHl6ZScsXG4gICAgbW9kZTogJ21vY2snLFxuICAgIHByb3ZpZGVyOiAnZGlzYWJsZWQnLFxuICAgIGFuYWx5c2lzSWQ6ICdtb2NrLWFuYWx5c2lzLTAwMScsXG4gICAgbW9kZWxUaWVyOiAnc3Ryb25nLW1vZGVsLXBsYWNlaG9sZGVyJyxcbiAgICBzdW1tYXJ5OlxuICAgICAgJ1x1NzZFRVx1NTI0RFx1N0Q0NFx1NTQwOFx1NEVFNVx1ODBBMVx1Nzk2OFx1NzBCQVx1NEUzQlx1RkYwQ0VURiBcdTgyMDdcdTczRkVcdTkxRDFcdTRFQ0RcdTUzRUZcdTRGNUNcdTcwQkFcdTVFNzNcdTg4NjFcdTZDRTJcdTUyRDVcdTc2ODRcdTRFM0JcdTg5ODFcdTVERTVcdTUxNzdcdTMwMDJcdTkwMTlcdTRFRkRcdTdENTBcdTY3OUNcdTY2QUJcdTY2NDJcdTY2MkZcdTU2RkFcdTVCOUFcdTUwNDdcdThDQzdcdTY1OTlcdUZGMENcdTc1MjhcdTRGODZcdTc4QkFcdThBOERcdTUyNERcdTVGOENcdTdBRUZcdTRFMzJcdTYzQTVcdTZENDFcdTdBMEJcdTMwMDInLFxuICAgIGhpZ2hsaWdodHM6IFtcbiAgICAgICdcdTgwQTFcdTc5NjhcdTkwRThcdTRGNERcdTRFQ0RcdTY2MkZcdTY3MDBcdTU5MjdcdTZCMEFcdTkxQ0RcdTRGODZcdTZFOTBcdTMwMDInLFxuICAgICAgJ1x1ODJFNVx1NjBGM1x1OTY0RFx1NEY0RVx1NkNFMlx1NTJENVx1RkYwQ1x1NTE0OFx1ODhEQyBFVEYgXHU2MjE2XHU3M0ZFXHU5MUQxXHU2NzAzXHU2QkQ0XHU1MkEwXHU1MDA5XHU5QUQ4IGJldGEgXHU4Q0M3XHU3NTIyXHU2NkY0XHU3QTY5XHU1MDY1XHUzMDAyJyxcbiAgICAgICdcdTZCNjNcdTVGMEZcdTcyNDhcdTYzQTVcdTUxNjUgR2VtaW5pIFx1NUY4Q1x1RkYwQ1x1NTNFRlx1NjI4QVx1OTAxOVx1ODhFMVx1NjNEQlx1NjIxMFx1NzcxRlx1NUJFNlx1NTIwNlx1Njc5MFx1N0Q1MFx1Njc5Q1x1MzAwMicsXG4gICAgXSxcbiAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyL2FuYWx5emVQb3J0Zm9saW8udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zZXJ2ZXIvYW5hbHl6ZVBvcnRmb2xpby50c1wiO2ltcG9ydCB7IEdvb2dsZUdlbkFJIH0gZnJvbSAnQGdvb2dsZS9nZW5haSc7XG5cbmltcG9ydCB0eXBlIHsgQXNzZXRUeXBlIH0gZnJvbSAnLi4vc3JjL3R5cGVzL3BvcnRmb2xpbyc7XG5pbXBvcnQgdHlwZSB7XG4gIFBvcnRmb2xpb0FuYWx5c2lzUmVxdWVzdCxcbiAgUG9ydGZvbGlvQW5hbHlzaXNSZXNwb25zZSxcbiAgUG9ydGZvbGlvQW5hbHlzaXNSZXN1bHQsXG59IGZyb20gJy4uL3NyYy90eXBlcy9wb3J0Zm9saW9BbmFseXNpcyc7XG5cbmNvbnN0IEFOQUxZWkVfUk9VVEUgPSAnL2FwaS9hbmFseXplJyBhcyBjb25zdDtcbmNvbnN0IERFRkFVTFRfQU5BTFlaRV9NT0RFTCA9ICdnZW1pbmktMy4xLXByby1wcmV2aWV3JztcblxuY2xhc3MgQW5hbHl6ZVBvcnRmb2xpb0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBzdGF0dXM6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHN0YXR1cyA9IDUwMCkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBbmFseXplUG9ydGZvbGlvRXJyb3InO1xuICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEFuYWx5emVNb2RlbCgpIHtcbiAgcmV0dXJuIHByb2Nlc3MuZW52LkdFTUlOSV9BTkFMWVpFX01PREVMPy50cmltKCkgfHwgREVGQVVMVF9BTkFMWVpFX01PREVMO1xufVxuXG5mdW5jdGlvbiBnZXRHZW1pbmlBcGlLZXkoKSB7XG4gIGNvbnN0IGFwaUtleSA9IHByb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZPy50cmltKCkgfHwgcHJvY2Vzcy5lbnYuR09PR0xFX0FQSV9LRVk/LnRyaW0oKTtcblxuICBpZiAoIWFwaUtleSkge1xuICAgIHRocm93IG5ldyBBbmFseXplUG9ydGZvbGlvRXJyb3IoXG4gICAgICAnXHU2NzJBXHU4QTJEXHU1QjlBIEdFTUlOSV9BUElfS0VZIFx1NjIxNiBHT09HTEVfQVBJX0tFWVx1RkYwQ1x1NjZBQlx1NjY0Mlx1NzEyMVx1NkNENVx1NTIwNlx1Njc5MFx1NjI5NVx1OENDN1x1N0Q0NFx1NTQwOFx1MzAwMicsXG4gICAgICA1MDAsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBhcGlLZXk7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplU3RyaW5nKHZhbHVlOiB1bmtub3duKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB0cmltbWVkID0gdmFsdWUudHJpbSgpO1xuICByZXR1cm4gdHJpbW1lZCA/IHRyaW1tZWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZU51bWJlcih2YWx1ZTogdW5rbm93bikge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUucmVwbGFjZSgvLC9nLCAnJykudHJpbSgpKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplQXNzZXRUeXBlKHZhbHVlOiB1bmtub3duKTogQXNzZXRUeXBlIHwgbnVsbCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChub3JtYWxpemVkID09PSAnc3RvY2snKSByZXR1cm4gJ3N0b2NrJztcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdldGYnKSByZXR1cm4gJ2V0Zic7XG4gIGlmIChub3JtYWxpemVkID09PSAnYm9uZCcpIHJldHVybiAnYm9uZCc7XG4gIGlmIChub3JtYWxpemVkID09PSAnY3J5cHRvJykgcmV0dXJuICdjcnlwdG8nO1xuICBpZiAobm9ybWFsaXplZCA9PT0gJ2Nhc2gnKSByZXR1cm4gJ2Nhc2gnO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVTdHJpbmdMaXN0KHZhbHVlOiB1bmtub3duLCBtaW5pbXVtSXRlbXM6IG51bWJlcikge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBpdGVtcyA9IHZhbHVlXG4gICAgLmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgc3RyaW5nID0+IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAubWFwKChpdGVtKSA9PiBpdGVtLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLnNsaWNlKDAsIDUpO1xuXG4gIHJldHVybiBpdGVtcy5sZW5ndGggPj0gbWluaW11bUl0ZW1zID8gaXRlbXMgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBbmFseXNpc1JlcXVlc3QocGF5bG9hZDogdW5rbm93bik6IFBvcnRmb2xpb0FuYWx5c2lzUmVxdWVzdCB7XG4gIGlmICh0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcgfHwgcGF5bG9hZCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBBbmFseXplUG9ydGZvbGlvRXJyb3IoJ1x1NjI5NVx1OENDN1x1N0Q0NFx1NTQwOFx1NTIwNlx1Njc5MFx1OEFDQlx1NkM0Mlx1NjgzQ1x1NUYwRlx1NEUwRFx1NkI2M1x1NzhCQVx1MzAwMicsIDQwMCk7XG4gIH1cblxuICBjb25zdCB2YWx1ZSA9IHBheWxvYWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNvbnN0IHNuYXBzaG90SGFzaCA9IHNhbml0aXplU3RyaW5nKHZhbHVlLnNuYXBzaG90SGFzaCk7XG4gIGNvbnN0IGFzc2V0Q291bnQgPSBzYW5pdGl6ZU51bWJlcih2YWx1ZS5hc3NldENvdW50KTtcbiAgY29uc3QgdG90YWxWYWx1ZUhLRCA9IHNhbml0aXplTnVtYmVyKHZhbHVlLnRvdGFsVmFsdWVIS0QpO1xuICBjb25zdCB0b3RhbENvc3RIS0QgPSBzYW5pdGl6ZU51bWJlcih2YWx1ZS50b3RhbENvc3RIS0QpO1xuXG4gIGlmICghc25hcHNob3RIYXNoKSB7XG4gICAgdGhyb3cgbmV3IEFuYWx5emVQb3J0Zm9saW9FcnJvcignXHU3RjNBXHU1QzExXHU2Mjk1XHU4Q0M3XHU3RDQ0XHU1NDA4XHU1RkVCXHU3MTY3XHU4QjU4XHU1MjI1XHU3OEJDXHVGRjBDXHU4QUNCXHU5MUNEXHU2NUIwXHU2NTc0XHU3NDA2XHU1RjhDXHU1MThEXHU4QTY2XHUzMDAyJywgNDAwKTtcbiAgfVxuXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZS5ob2xkaW5ncykgfHwgdmFsdWUuaG9sZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEFuYWx5emVQb3J0Zm9saW9FcnJvcignXHU3NkVFXHU1MjREXHU2QzkyXHU2NzA5XHU1M0VGXHU1MjA2XHU2NzkwXHU3Njg0XHU4Q0M3XHU3NTIyXHUzMDAyJywgNDAwKTtcbiAgfVxuXG4gIGNvbnN0IGhvbGRpbmdzID0gdmFsdWUuaG9sZGluZ3NcbiAgICAubWFwKChpdGVtKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnIHx8IGl0ZW0gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFzc2V0ID0gaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgIGNvbnN0IGlkID0gc2FuaXRpemVTdHJpbmcoYXNzZXQuaWQpO1xuICAgICAgY29uc3QgbmFtZSA9IHNhbml0aXplU3RyaW5nKGFzc2V0Lm5hbWUpO1xuICAgICAgY29uc3QgdGlja2VyID0gc2FuaXRpemVTdHJpbmcoYXNzZXQudGlja2VyKTtcbiAgICAgIGNvbnN0IGFzc2V0VHlwZSA9IHNhbml0aXplQXNzZXRUeXBlKGFzc2V0LmFzc2V0VHlwZSk7XG4gICAgICBjb25zdCBhY2NvdW50U291cmNlID0gc2FuaXRpemVTdHJpbmcoYXNzZXQuYWNjb3VudFNvdXJjZSk7XG4gICAgICBjb25zdCBjdXJyZW5jeSA9IHNhbml0aXplU3RyaW5nKGFzc2V0LmN1cnJlbmN5KTtcbiAgICAgIGNvbnN0IHF1YW50aXR5ID0gc2FuaXRpemVOdW1iZXIoYXNzZXQucXVhbnRpdHkpO1xuICAgICAgY29uc3QgYXZlcmFnZUNvc3QgPSBzYW5pdGl6ZU51bWJlcihhc3NldC5hdmVyYWdlQ29zdCk7XG4gICAgICBjb25zdCBjdXJyZW50UHJpY2UgPSBzYW5pdGl6ZU51bWJlcihhc3NldC5jdXJyZW50UHJpY2UpO1xuICAgICAgY29uc3QgbWFya2V0VmFsdWUgPSBzYW5pdGl6ZU51bWJlcihhc3NldC5tYXJrZXRWYWx1ZSk7XG4gICAgICBjb25zdCBjb3N0VmFsdWUgPSBzYW5pdGl6ZU51bWJlcihhc3NldC5jb3N0VmFsdWUpO1xuXG4gICAgICBpZiAoXG4gICAgICAgICFpZCB8fFxuICAgICAgICAhbmFtZSB8fFxuICAgICAgICAhdGlja2VyIHx8XG4gICAgICAgICFhc3NldFR5cGUgfHxcbiAgICAgICAgIWFjY291bnRTb3VyY2UgfHxcbiAgICAgICAgIWN1cnJlbmN5IHx8XG4gICAgICAgIHF1YW50aXR5ID09IG51bGwgfHxcbiAgICAgICAgYXZlcmFnZUNvc3QgPT0gbnVsbCB8fFxuICAgICAgICBjdXJyZW50UHJpY2UgPT0gbnVsbCB8fFxuICAgICAgICBtYXJrZXRWYWx1ZSA9PSBudWxsIHx8XG4gICAgICAgIGNvc3RWYWx1ZSA9PSBudWxsXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkLFxuICAgICAgICBuYW1lLFxuICAgICAgICB0aWNrZXIsXG4gICAgICAgIGFzc2V0VHlwZSxcbiAgICAgICAgYWNjb3VudFNvdXJjZSxcbiAgICAgICAgY3VycmVuY3k6IGN1cnJlbmN5LnRvVXBwZXJDYXNlKCksXG4gICAgICAgIHF1YW50aXR5LFxuICAgICAgICBhdmVyYWdlQ29zdCxcbiAgICAgICAgY3VycmVudFByaWNlLFxuICAgICAgICBtYXJrZXRWYWx1ZSxcbiAgICAgICAgY29zdFZhbHVlLFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIFBvcnRmb2xpb0FuYWx5c2lzUmVxdWVzdFsnaG9sZGluZ3MnXVtudW1iZXJdID0+IGl0ZW0gIT09IG51bGwpO1xuXG4gIGlmIChob2xkaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgQW5hbHl6ZVBvcnRmb2xpb0Vycm9yKCdcdTc2RUVcdTUyNERcdTZDOTJcdTY3MDlcdTVCOENcdTY1NzRcdTc2ODRcdThDQzdcdTc1MjJcdThDQzdcdTY1OTlcdTUzRUZcdTUyMDZcdTY3OTBcdTMwMDInLCA0MDApO1xuICB9XG5cbiAgY29uc3QgYWxsb2NhdGlvbnNCeVR5cGUgPSBBcnJheS5pc0FycmF5KHZhbHVlLmFsbG9jYXRpb25zQnlUeXBlKVxuICAgID8gdmFsdWUuYWxsb2NhdGlvbnNCeVR5cGVcbiAgICAgICAgLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgaXRlbSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgYWxsb2NhdGlvbiA9IGl0ZW0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgY29uc3QgYXNzZXRUeXBlID0gc2FuaXRpemVBc3NldFR5cGUoYWxsb2NhdGlvbi5hc3NldFR5cGUpO1xuICAgICAgICAgIGNvbnN0IHBlcmNlbnRhZ2UgPSBzYW5pdGl6ZU51bWJlcihhbGxvY2F0aW9uLnBlcmNlbnRhZ2UpO1xuICAgICAgICAgIGNvbnN0IGJ1Y2tldFRvdGFsID0gc2FuaXRpemVOdW1iZXIoYWxsb2NhdGlvbi50b3RhbFZhbHVlSEtEKTtcblxuICAgICAgICAgIGlmICghYXNzZXRUeXBlIHx8IHBlcmNlbnRhZ2UgPT0gbnVsbCB8fCBidWNrZXRUb3RhbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXNzZXRUeXBlLFxuICAgICAgICAgICAgcGVyY2VudGFnZSxcbiAgICAgICAgICAgIHRvdGFsVmFsdWVIS0Q6IGJ1Y2tldFRvdGFsLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICApOiBpdGVtIGlzIFBvcnRmb2xpb0FuYWx5c2lzUmVxdWVzdFsnYWxsb2NhdGlvbnNCeVR5cGUnXVtudW1iZXJdID0+IGl0ZW0gIT09IG51bGwsXG4gICAgICAgIClcbiAgICA6IFtdO1xuXG4gIGNvbnN0IGFsbG9jYXRpb25zQnlDdXJyZW5jeSA9IEFycmF5LmlzQXJyYXkodmFsdWUuYWxsb2NhdGlvbnNCeUN1cnJlbmN5KVxuICAgID8gdmFsdWUuYWxsb2NhdGlvbnNCeUN1cnJlbmN5XG4gICAgICAgIC5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnIHx8IGl0ZW0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGFsbG9jYXRpb24gPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICAgIGNvbnN0IGN1cnJlbmN5ID0gc2FuaXRpemVTdHJpbmcoYWxsb2NhdGlvbi5jdXJyZW5jeSk7XG4gICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHNhbml0aXplTnVtYmVyKGFsbG9jYXRpb24ucGVyY2VudGFnZSk7XG4gICAgICAgICAgY29uc3QgYnVja2V0VG90YWwgPSBzYW5pdGl6ZU51bWJlcihhbGxvY2F0aW9uLnRvdGFsVmFsdWVIS0QpO1xuXG4gICAgICAgICAgaWYgKCFjdXJyZW5jeSB8fCBwZXJjZW50YWdlID09IG51bGwgfHwgYnVja2V0VG90YWwgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN1cnJlbmN5OiBjdXJyZW5jeS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgcGVyY2VudGFnZSxcbiAgICAgICAgICAgIHRvdGFsVmFsdWVIS0Q6IGJ1Y2tldFRvdGFsLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICApOiBpdGVtIGlzIFBvcnRmb2xpb0FuYWx5c2lzUmVxdWVzdFsnYWxsb2NhdGlvbnNCeUN1cnJlbmN5J11bbnVtYmVyXSA9PiBpdGVtICE9PSBudWxsLFxuICAgICAgICApXG4gICAgOiBbXTtcblxuICByZXR1cm4ge1xuICAgIHNuYXBzaG90SGFzaCxcbiAgICBhc3NldENvdW50OiBhc3NldENvdW50ID8/IGhvbGRpbmdzLmxlbmd0aCxcbiAgICB0b3RhbFZhbHVlSEtEOiB0b3RhbFZhbHVlSEtEID8/IDAsXG4gICAgdG90YWxDb3N0SEtEOiB0b3RhbENvc3RIS0QgPz8gMCxcbiAgICBob2xkaW5ncyxcbiAgICBhbGxvY2F0aW9uc0J5VHlwZSxcbiAgICBhbGxvY2F0aW9uc0J5Q3VycmVuY3ksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0cmlwSnNvbkZlbmNlKHRleHQ6IHN0cmluZykge1xuICBjb25zdCB0cmltbWVkID0gdGV4dC50cmltKCk7XG4gIGlmICghdHJpbW1lZC5zdGFydHNXaXRoKCdgYGAnKSkge1xuICAgIHJldHVybiB0cmltbWVkO1xuICB9XG5cbiAgcmV0dXJuIHRyaW1tZWRcbiAgICAucmVwbGFjZSgvXmBgYGpzb25cXHMqL2ksICcnKVxuICAgIC5yZXBsYWNlKC9eYGBgXFxzKi9pLCAnJylcbiAgICAucmVwbGFjZSgvXFxzKmBgYCQvLCAnJylcbiAgICAudHJpbSgpO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1vZGVsSnNvbih0ZXh0OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShzdHJpcEpzb25GZW5jZSh0ZXh0KSkgYXMgdW5rbm93bjtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEFuYWx5emVQb3J0Zm9saW9FcnJvcignR2VtaW5pIFx1NjcyQVx1NTZERVx1NTBCM1x1NTNFRlx1ODlFM1x1Njc5MFx1NzY4NFx1NTIwNlx1Njc5MCBKU09OXHVGRjBDXHU4QUNCXHU3QTBEXHU1RjhDXHU1MThEXHU4QTY2XHUzMDAyJywgNTAyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUFuYWx5c2lzUmVzdWx0KHJhd1BheWxvYWQ6IHVua25vd24pOiBQb3J0Zm9saW9BbmFseXNpc1Jlc3VsdCB7XG4gIGlmICh0eXBlb2YgcmF3UGF5bG9hZCAhPT0gJ29iamVjdCcgfHwgcmF3UGF5bG9hZCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBBbmFseXplUG9ydGZvbGlvRXJyb3IoJ0dlbWluaSBcdTU2REVcdTUwQjNcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdTMwMDInLCA1MDIpO1xuICB9XG5cbiAgY29uc3QgdmFsdWUgPSByYXdQYXlsb2FkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjb25zdCBzdW1tYXJ5ID0gc2FuaXRpemVTdHJpbmcodmFsdWUuc3VtbWFyeSk7XG4gIGNvbnN0IHRvcFJpc2tzID0gc2FuaXRpemVTdHJpbmdMaXN0KHZhbHVlLnRvcFJpc2tzLCAxKTtcbiAgY29uc3QgYWxsb2NhdGlvbkluc2lnaHRzID0gc2FuaXRpemVTdHJpbmdMaXN0KHZhbHVlLmFsbG9jYXRpb25JbnNpZ2h0cywgMSk7XG4gIGNvbnN0IGN1cnJlbmN5RXhwb3N1cmUgPSBzYW5pdGl6ZVN0cmluZ0xpc3QodmFsdWUuY3VycmVuY3lFeHBvc3VyZSwgMSk7XG4gIGNvbnN0IG5leHRRdWVzdGlvbnMgPSBzYW5pdGl6ZVN0cmluZ0xpc3QodmFsdWUubmV4dFF1ZXN0aW9ucywgMSk7XG5cbiAgaWYgKCFzdW1tYXJ5IHx8ICF0b3BSaXNrcyB8fCAhYWxsb2NhdGlvbkluc2lnaHRzIHx8ICFjdXJyZW5jeUV4cG9zdXJlIHx8ICFuZXh0UXVlc3Rpb25zKSB7XG4gICAgdGhyb3cgbmV3IEFuYWx5emVQb3J0Zm9saW9FcnJvcignR2VtaW5pIFx1NTZERVx1NTBCM1x1NkIwNFx1NEY0RFx1NEUwRFx1NUI4Q1x1NjU3NFx1RkYwQ1x1OEFDQlx1N0EwRFx1NUY4Q1x1NTE4RFx1OEE2Nlx1MzAwMicsIDUwMik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1bW1hcnksXG4gICAgdG9wUmlza3MsXG4gICAgYWxsb2NhdGlvbkluc2lnaHRzLFxuICAgIGN1cnJlbmN5RXhwb3N1cmUsXG4gICAgbmV4dFF1ZXN0aW9ucyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRQcm9tcHQocmVxdWVzdDogUG9ydGZvbGlvQW5hbHlzaXNSZXF1ZXN0KSB7XG4gIHJldHVybiBgXG5Zb3UgYXJlIGEgcG9ydGZvbGlvIGFuYWx5c2lzIGFzc2lzdGFudC5cblxuQW5hbHl6ZSBPTkxZIHRoZSBwb3J0Zm9saW8gc25hcHNob3QgcHJvdmlkZWQgYmVsb3cuXG5SZXR1cm4gT05MWSByYXcgSlNPTi4gRG8gbm90IHVzZSBtYXJrZG93biBmZW5jZXMuIERvIG5vdCBhZGQgYW55IGV4cGxhbmF0aW9uIG91dHNpZGUgSlNPTi5cblxuVXNlIHRoaXMgZXhhY3Qgc2NoZW1hOlxue1xuICBcInN1bW1hcnlcIjogc3RyaW5nLFxuICBcInRvcFJpc2tzXCI6IHN0cmluZ1tdLFxuICBcImFsbG9jYXRpb25JbnNpZ2h0c1wiOiBzdHJpbmdbXSxcbiAgXCJjdXJyZW5jeUV4cG9zdXJlXCI6IHN0cmluZ1tdLFxuICBcIm5leHRRdWVzdGlvbnNcIjogc3RyaW5nW11cbn1cblxuUnVsZXM6XG4tIFdyaXRlIGFsbCBvdXRwdXQgaW4gVHJhZGl0aW9uYWwgQ2hpbmVzZS5cbi0gQmFzZSB5b3VyIHJlYXNvbmluZyBvbmx5IG9uIHRoZSBwcm92aWRlZCBob2xkaW5ncywgbGF0ZXN0IHByaWNlcywgYXNzZXQgY2F0ZWdvcmllcywgY3VycmVuY2llcywgYW5kIGF2ZXJhZ2UgY29zdHMuXG4tIERvIG5vdCBpbnZlbnQgaGlzdG9yaWNhbCByZXR1cm5zLCBkaXZpZGVuZHMsIG1hY3JvIG5ld3MsIG9yIGV4dGVybmFsIGZhY3RzIHRoYXQgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBpbnB1dC5cbi0gc3VtbWFyeSBzaG91bGQgYmUgMiB0byA0IHNlbnRlbmNlcyBhbmQgc2hvdWxkIGV4cGxpY2l0bHkgbWVudGlvbiB0aGUgYmlnZ2VzdCBhbGxvY2F0aW9uIG9yIGNvbmNlbnRyYXRpb24gcGF0dGVybi5cbi0gdG9wUmlza3Mgc2hvdWxkIGNvbnRhaW4gMyB0byA1IHNob3J0IGJ1bGxldHMgYWJvdXQgY29uY2VudHJhdGlvbiwgZGl2ZXJzaWZpY2F0aW9uIGdhcHMsIGxpcXVpZGl0eSwgb3IgZGF0YSBsaW1pdGF0aW9ucy5cbi0gYWxsb2NhdGlvbkluc2lnaHRzIHNob3VsZCBjb250YWluIDMgdG8gNSBjb25jcmV0ZSBvYnNlcnZhdGlvbnMgdGllZCB0byB0aGUgYWN0dWFsIGFzc2V0IHR5cGUgd2VpZ2h0cyBvciBjb3N0IHN0cnVjdHVyZS5cbi0gY3VycmVuY3lFeHBvc3VyZSBzaG91bGQgY29udGFpbiAyIHRvIDQgc2hvcnQgYnVsbGV0cyBhYm91dCBIS0QvVVNEIG9yIG90aGVyIHZpc2libGUgY3VycmVuY3kgY29uY2VudHJhdGlvbi5cbi0gbmV4dFF1ZXN0aW9ucyBzaG91bGQgY29udGFpbiAzIHRvIDUgc2hvcnQsIGFjdGlvbmFibGUgZm9sbG93LXVwIHF1ZXN0aW9ucyB0aGUgdXNlciBtYXkgd2FudCB0byBhc2sgbmV4dC5cbi0gSWYgdGhlIGRhdGEgbGFja3MgcHJpY2UgaGlzdG9yeSBvciBjYXNoLWZsb3cgaGlzdG9yeSwgbWVudGlvbiB0aGF0IGxpbWl0YXRpb24gYnJpZWZseSB3aGVyZSByZWxldmFudC5cbi0gS2VlcCB0aGUgdG9uZSBwcmFjdGljYWwsIGNhbG0sIGFuZCBiZWdpbm5lci1mcmllbmRseS5cblxuUG9ydGZvbGlvIHNuYXBzaG90OlxuJHtKU09OLnN0cmluZ2lmeShyZXF1ZXN0LCBudWxsLCAyKX1cbiAgYC50cmltKCk7XG59XG5cbmNvbnN0IHJlc3BvbnNlSnNvblNjaGVtYSA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgcmVxdWlyZWQ6IFtcbiAgICAnc3VtbWFyeScsXG4gICAgJ3RvcFJpc2tzJyxcbiAgICAnYWxsb2NhdGlvbkluc2lnaHRzJyxcbiAgICAnY3VycmVuY3lFeHBvc3VyZScsXG4gICAgJ25leHRRdWVzdGlvbnMnLFxuICBdLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgc3VtbWFyeTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgIHRvcFJpc2tzOiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgbWluSXRlbXM6IDEsXG4gICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgIH0sXG4gICAgYWxsb2NhdGlvbkluc2lnaHRzOiB7XG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgbWluSXRlbXM6IDEsXG4gICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgIH0sXG4gICAgY3VycmVuY3lFeHBvc3VyZToge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIG1pbkl0ZW1zOiAxLFxuICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICB9LFxuICAgIG5leHRRdWVzdGlvbnM6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBtaW5JdGVtczogMSxcbiAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgfSxcbiAgfSxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbmFseXplUG9ydGZvbGlvRXJyb3JSZXNwb25zZShlcnJvcjogdW5rbm93bikge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBbmFseXplUG9ydGZvbGlvRXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzOiBlcnJvci5zdGF0dXMsXG4gICAgICBib2R5OiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgcm91dGU6IEFOQUxZWkVfUk9VVEUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICByb3V0ZTogQU5BTFlaRV9ST1VURSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3RhdHVzOiA1MDAsXG4gICAgYm9keToge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgcm91dGU6IEFOQUxZWkVfUk9VVEUsXG4gICAgICBtZXNzYWdlOiAnXHU2Mjk1XHU4Q0M3XHU3RDQ0XHU1NDA4XHU1MjA2XHU2NzkwXHU1OTMxXHU2NTU3XHVGRjBDXHU4QUNCXHU3QTBEXHU1RjhDXHU1MThEXHU4QTY2XHUzMDAyJyxcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZVBvcnRmb2xpbyhcbiAgcGF5bG9hZDogdW5rbm93bixcbik6IFByb21pc2U8UG9ydGZvbGlvQW5hbHlzaXNSZXNwb25zZT4ge1xuICBjb25zdCByZXF1ZXN0ID0gbm9ybWFsaXplQW5hbHlzaXNSZXF1ZXN0KHBheWxvYWQpO1xuICBjb25zdCBhcGlLZXkgPSBnZXRHZW1pbmlBcGlLZXkoKTtcbiAgY29uc3QgbW9kZWwgPSBnZXRBbmFseXplTW9kZWwoKTtcbiAgY29uc3QgYWkgPSBuZXcgR29vZ2xlR2VuQUkoeyBhcGlLZXkgfSk7XG4gIGNvbnN0IHByb21wdCA9IGJ1aWxkUHJvbXB0KHJlcXVlc3QpO1xuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFpLm1vZGVscy5nZW5lcmF0ZUNvbnRlbnQoe1xuICAgIG1vZGVsLFxuICAgIGNvbnRlbnRzOiBwcm9tcHQsXG4gICAgY29uZmlnOiB7XG4gICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgcmVzcG9uc2VNaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgcmVzcG9uc2VKc29uU2NoZW1hLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCByYXcgPSBwYXJzZU1vZGVsSnNvbihyZXNwb25zZS50ZXh0ID8/ICcnKTtcbiAgY29uc3QgcmVzdWx0ID0gc2FuaXRpemVBbmFseXNpc1Jlc3VsdChyYXcpO1xuXG4gIHJldHVybiB7XG4gICAgb2s6IHRydWUsXG4gICAgcm91dGU6IEFOQUxZWkVfUk9VVEUsXG4gICAgbW9kZTogJ2xpdmUnLFxuICAgIG1vZGVsLFxuICAgIHNuYXBzaG90SGFzaDogcmVxdWVzdC5zbmFwc2hvdEhhc2gsXG4gICAgZ2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAuLi5yZXN1bHQsXG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyL3NlcnZlci9leHRyYWN0QXNzZXRzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyL2V4dHJhY3RBc3NldHMudHNcIjtpbXBvcnQgeyBHb29nbGVHZW5BSSB9IGZyb20gJ0Bnb29nbGUvZ2VuYWknO1xuXG5pbXBvcnQgdHlwZSB7XG4gIEV4dHJhY3RBc3NldHNSZXF1ZXN0LFxuICBFeHRyYWN0QXNzZXRzUmVzcG9uc2UsXG4gIEV4dHJhY3RlZEFzc2V0Q2FuZGlkYXRlLFxufSBmcm9tICcuLi9zcmMvdHlwZXMvZXh0cmFjdEFzc2V0cyc7XG5pbXBvcnQgdHlwZSB7IEFzc2V0VHlwZSB9IGZyb20gJy4uL3NyYy90eXBlcy9wb3J0Zm9saW8nO1xuXG5jb25zdCBFWFRSQUNUX1JPVVRFID0gJy9hcGkvZXh0cmFjdC1hc3NldHMnIGFzIGNvbnN0O1xuY29uc3QgREVGQVVMVF9FWFRSQUNUX01PREVMID0gJ2dlbWluaS0zLjEtZmxhc2gtbGl0ZSc7XG5cbmNsYXNzIEV4dHJhY3RBc3NldHNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgc3RhdHVzOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBzdGF0dXMgPSA1MDApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnRXh0cmFjdEFzc2V0c0Vycm9yJztcbiAgICB0aGlzLnN0YXR1cyA9IHN0YXR1cztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRFeHRyYWN0TW9kZWwoKSB7XG4gIHJldHVybiBwcm9jZXNzLmVudi5HRU1JTklfRVhUUkFDVF9NT0RFTD8udHJpbSgpIHx8IERFRkFVTFRfRVhUUkFDVF9NT0RFTDtcbn1cblxuZnVuY3Rpb24gZ2V0R2VtaW5pQXBpS2V5KCkge1xuICBjb25zdCBhcGlLZXkgPSBwcm9jZXNzLmVudi5HRU1JTklfQVBJX0tFWT8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkdPT0dMRV9BUElfS0VZPy50cmltKCk7XG5cbiAgaWYgKCFhcGlLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXh0cmFjdEFzc2V0c0Vycm9yKFxuICAgICAgJ1x1NjcyQVx1OEEyRFx1NUI5QSBHRU1JTklfQVBJX0tFWSBcdTYyMTYgR09PR0xFX0FQSV9LRVlcdUZGMENcdTY2QUJcdTY2NDJcdTcxMjFcdTZDRDVcdTg5RTNcdTY3OTBcdTYyMkFcdTU3MTZcdTMwMDInLFxuICAgICAgNTAwLFxuICAgICk7XG4gIH1cblxuICByZXR1cm4gYXBpS2V5O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVFeHRyYWN0QXNzZXRzUmVxdWVzdChwYXlsb2FkOiB1bmtub3duKTogRXh0cmFjdEFzc2V0c1JlcXVlc3Qge1xuICBpZiAodHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnIHx8IHBheWxvYWQgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXh0cmFjdEFzc2V0c0Vycm9yKCdcdTYyMkFcdTU3MTZcdTg5RTNcdTY3OTBcdThBQ0JcdTZDNDJcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdTMwMDInLCA0MDApO1xuICB9XG5cbiAgY29uc3QgdmFsdWUgPSBwYXlsb2FkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjb25zdCBmaWxlTmFtZSA9XG4gICAgdHlwZW9mIHZhbHVlLmZpbGVOYW1lID09PSAnc3RyaW5nJyA/IHZhbHVlLmZpbGVOYW1lLnRyaW0oKSA6ICcnO1xuICBjb25zdCBtaW1lVHlwZSA9XG4gICAgdHlwZW9mIHZhbHVlLm1pbWVUeXBlID09PSAnc3RyaW5nJyA/IHZhbHVlLm1pbWVUeXBlLnRyaW0oKSA6ICcnO1xuICBjb25zdCBpbWFnZUJhc2U2NCA9XG4gICAgdHlwZW9mIHZhbHVlLmltYWdlQmFzZTY0ID09PSAnc3RyaW5nJyA/IHZhbHVlLmltYWdlQmFzZTY0LnRyaW0oKSA6ICcnO1xuXG4gIGlmICghZmlsZU5hbWUgfHwgIW1pbWVUeXBlIHx8ICFpbWFnZUJhc2U2NCkge1xuICAgIHRocm93IG5ldyBFeHRyYWN0QXNzZXRzRXJyb3IoJ1x1N0YzQVx1NUMxMVx1NUZDNVx1ODk4MVx1NzY4NFx1NjIyQVx1NTcxNlx1OENDN1x1NjU5OVx1RkYwQ1x1OEFDQlx1OTFDRFx1NjVCMFx1NEUwQVx1NTBCM1x1NTcxNlx1NzI0N1x1MzAwMicsIDQwMCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZpbGVOYW1lLFxuICAgIG1pbWVUeXBlLFxuICAgIGltYWdlQmFzZTY0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZVN0cmluZyh2YWx1ZTogdW5rbm93bikge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgcmV0dXJuIHRyaW1tZWQgPyB0cmltbWVkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVOdW1iZXIodmFsdWU6IHVua25vd24pIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgTnVtYmVyLmlzRmluaXRlKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uc3QgY2xlYW5lZCA9IHZhbHVlLnJlcGxhY2UoLywvZywgJycpLnRyaW0oKTtcbiAgICBpZiAoIWNsZWFuZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlZCA9IE51bWJlcihjbGVhbmVkKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplVHlwZSh2YWx1ZTogdW5rbm93bik6IEFzc2V0VHlwZSB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3Qgbm9ybWFsaXplZCA9IHZhbHVlLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmIChub3JtYWxpemVkID09PSAnc3RvY2snIHx8IG5vcm1hbGl6ZWQgPT09ICdzdG9ja3MnIHx8IG5vcm1hbGl6ZWQgPT09ICdlcXVpdHknKSB7XG4gICAgcmV0dXJuICdzdG9jayc7XG4gIH1cblxuICBpZiAobm9ybWFsaXplZCA9PT0gJ2V0ZicpIHtcbiAgICByZXR1cm4gJ2V0Zic7XG4gIH1cblxuICBpZiAobm9ybWFsaXplZCA9PT0gJ2JvbmQnIHx8IG5vcm1hbGl6ZWQgPT09ICdib25kcycgfHwgbm9ybWFsaXplZCA9PT0gJ2ZpeGVkIGluY29tZScpIHtcbiAgICByZXR1cm4gJ2JvbmQnO1xuICB9XG5cbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdjcnlwdG8nIHx8IG5vcm1hbGl6ZWQgPT09ICdjcnlwdG9jdXJyZW5jeScgfHwgbm9ybWFsaXplZCA9PT0gJ2NvaW4nKSB7XG4gICAgcmV0dXJuICdjcnlwdG8nO1xuICB9XG5cbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdjYXNoJykge1xuICAgIHJldHVybiAnY2FzaCc7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVDdXJyZW5jeSh2YWx1ZTogdW5rbm93bikge1xuICBjb25zdCBub3JtYWxpemVkID0gc2FuaXRpemVTdHJpbmcodmFsdWUpO1xuICByZXR1cm4gbm9ybWFsaXplZCA/IG5vcm1hbGl6ZWQudG9VcHBlckNhc2UoKSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplRXh0cmFjdGVkQXNzZXRzKHJhd1BheWxvYWQ6IHVua25vd24pOiBFeHRyYWN0ZWRBc3NldENhbmRpZGF0ZVtdIHtcbiAgaWYgKFxuICAgIHR5cGVvZiByYXdQYXlsb2FkICE9PSAnb2JqZWN0JyB8fFxuICAgIHJhd1BheWxvYWQgPT09IG51bGwgfHxcbiAgICAhKCdhc3NldHMnIGluIHJhd1BheWxvYWQpIHx8XG4gICAgIUFycmF5LmlzQXJyYXkocmF3UGF5bG9hZC5hc3NldHMpXG4gICkge1xuICAgIHRocm93IG5ldyBFeHRyYWN0QXNzZXRzRXJyb3IoJ0dlbWluaSBcdTU2REVcdTUwQjNcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdUZGMENcdTY3MkFcdTYyN0VcdTUyMzAgYXNzZXRzIFx1OTY2M1x1NTIxN1x1MzAwMicsIDUwMik7XG4gIH1cblxuICByZXR1cm4gcmF3UGF5bG9hZC5hc3NldHMubWFwKChhc3NldCkgPT4ge1xuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIHR5cGVvZiBhc3NldCA9PT0gJ29iamVjdCcgJiYgYXNzZXQgIT09IG51bGxcbiAgICAgICAgPyAoYXNzZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pXG4gICAgICAgIDoge307XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogc2FuaXRpemVTdHJpbmcodmFsdWUubmFtZSksXG4gICAgICB0aWNrZXI6IHNhbml0aXplU3RyaW5nKHZhbHVlLnRpY2tlciksXG4gICAgICB0eXBlOiBzYW5pdGl6ZVR5cGUodmFsdWUudHlwZSksXG4gICAgICBxdWFudGl0eTogc2FuaXRpemVOdW1iZXIodmFsdWUucXVhbnRpdHkpLFxuICAgICAgY3VycmVuY3k6IHNhbml0aXplQ3VycmVuY3kodmFsdWUuY3VycmVuY3kpLFxuICAgICAgY29zdEJhc2lzOiBzYW5pdGl6ZU51bWJlcih2YWx1ZS5jb3N0QmFzaXMpLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzdHJpcEpzb25GZW5jZSh0ZXh0OiBzdHJpbmcpIHtcbiAgY29uc3QgdHJpbW1lZCA9IHRleHQudHJpbSgpO1xuICBpZiAoIXRyaW1tZWQuc3RhcnRzV2l0aCgnYGBgJykpIHtcbiAgICByZXR1cm4gdHJpbW1lZDtcbiAgfVxuXG4gIHJldHVybiB0cmltbWVkXG4gICAgLnJlcGxhY2UoL15gYGBqc29uXFxzKi9pLCAnJylcbiAgICAucmVwbGFjZSgvXmBgYFxccyovaSwgJycpXG4gICAgLnJlcGxhY2UoL1xccypgYGAkLywgJycpXG4gICAgLnRyaW0oKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VHZW1pbmlKc29uKHRleHQ6IHN0cmluZykge1xuICBjb25zdCBub3JtYWxpemVkID0gc3RyaXBKc29uRmVuY2UodGV4dCk7XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShub3JtYWxpemVkKSBhcyB1bmtub3duO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXh0cmFjdEFzc2V0c0Vycm9yKCdHZW1pbmkgXHU2NzJBXHU1NkRFXHU1MEIzXHU1M0VGXHU4OUUzXHU2NzkwXHU3Njg0IEpTT05cdUZGMENcdThBQ0JcdTYzREJcdTRFMDBcdTVGMzVcdTY2RjRcdTZFMDVcdTY2NzBcdTc2ODRcdTYyMkFcdTU3MTZcdTUxOERcdThBNjZcdTMwMDInLCA1MDIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkRXh0cmFjdGlvblByb21wdChmaWxlTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBgXG5Zb3UgYXJlIGV4dHJhY3RpbmcgcG9ydGZvbGlvIGhvbGRpbmdzIGZyb20gYSBicm9rZXJhZ2Ugb3Igd2FsbGV0IHNjcmVlbnNob3QuXG5cblJldHVybiBPTkxZIHJhdyBKU09OLiBEbyBub3QgdXNlIG1hcmtkb3duIGZlbmNlcy4gRG8gbm90IGFkZCBhbnkgZXhwbGFuYXRpb24uXG5cblVzZSB0aGlzIGV4YWN0IHNoYXBlOlxue1xuICBcImFzc2V0c1wiOiBbXG4gICAge1xuICAgICAgXCJuYW1lXCI6IHN0cmluZyB8IG51bGwsXG4gICAgICBcInRpY2tlclwiOiBzdHJpbmcgfCBudWxsLFxuICAgICAgXCJ0eXBlXCI6IFwic3RvY2tcIiB8IFwiZXRmXCIgfCBcImJvbmRcIiB8IFwiY3J5cHRvXCIgfCBcImNhc2hcIiB8IG51bGwsXG4gICAgICBcInF1YW50aXR5XCI6IG51bWJlciB8IG51bGwsXG4gICAgICBcImN1cnJlbmN5XCI6IHN0cmluZyB8IG51bGwsXG4gICAgICBcImNvc3RCYXNpc1wiOiBudW1iZXIgfCBudWxsXG4gICAgfVxuICBdXG59XG5cblJ1bGVzOlxuLSBFeHRyYWN0IG9ubHkgYXNzZXRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgaW4gdGhlIHNjcmVlbnNob3QuXG4tIElmIGEgZmllbGQgaXMgbm90IHZpc2libGUgb3IgdW5jZXJ0YWluLCBzZXQgaXQgdG8gbnVsbC5cbi0gXCJjb3N0QmFzaXNcIiBtZWFucyBhdmVyYWdlIGNvc3QgcGVyIHVuaXQsIG5vdCB0b3RhbCBjb3N0LlxuLSBcImN1cnJlbmN5XCIgc2hvdWxkIGJlIGFuIHVwcGVyY2FzZSBjdXJyZW5jeSBjb2RlIGxpa2UgSEtEIG9yIFVTRCB3aGVuIHZpc2libGUuXG4tIFwidHlwZVwiIG11c3QgYmUgb25lIG9mOiBzdG9jaywgZXRmLCBib25kLCBjcnlwdG8sIGNhc2gsIG9yIG51bGwuXG4tIEtlZXAgbnVtYmVycyBhcyBKU09OIG51bWJlcnMsIG5vdCBzdHJpbmdzLlxuLSBEbyBub3QgaW5jbHVkZSBmaWVsZHMgb3V0c2lkZSB0aGUgZml4ZWQgc2NoZW1hLlxuXG5TY3JlZW5zaG90IGZpbGVuYW1lOiAke2ZpbGVOYW1lfVxuICBgLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dHJhY3RBc3NldHNFcnJvclJlc3BvbnNlKGVycm9yOiB1bmtub3duKSB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEV4dHJhY3RBc3NldHNFcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXM6IGVycm9yLnN0YXR1cyxcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICByb3V0ZTogRVhUUkFDVF9ST1VURSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogNTAwLFxuICAgICAgYm9keToge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIHJvdXRlOiBFWFRSQUNUX1JPVVRFLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdGF0dXM6IDUwMCxcbiAgICBib2R5OiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICByb3V0ZTogRVhUUkFDVF9ST1VURSxcbiAgICAgIG1lc3NhZ2U6ICdcdTYyMkFcdTU3MTZcdTg5RTNcdTY3OTBcdTU5MzFcdTY1NTdcdUZGMENcdThBQ0JcdTdBMERcdTVGOENcdTUxOERcdThBNjZcdTMwMDInLFxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleHRyYWN0QXNzZXRzRnJvbVNjcmVlbnNob3QoXG4gIHBheWxvYWQ6IHVua25vd24sXG4pOiBQcm9taXNlPEV4dHJhY3RBc3NldHNSZXNwb25zZT4ge1xuICBjb25zdCBub3JtYWxpemVkUGF5bG9hZCA9IG5vcm1hbGl6ZUV4dHJhY3RBc3NldHNSZXF1ZXN0KHBheWxvYWQpO1xuXG4gIGNvbnN0IGFwaUtleSA9IGdldEdlbWluaUFwaUtleSgpO1xuICBjb25zdCBhaSA9IG5ldyBHb29nbGVHZW5BSSh7IGFwaUtleSB9KTtcbiAgY29uc3QgbW9kZWwgPSBnZXRFeHRyYWN0TW9kZWwoKTtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWkubW9kZWxzLmdlbmVyYXRlQ29udGVudCh7XG4gICAgbW9kZWwsXG4gICAgY29udGVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogYnVpbGRFeHRyYWN0aW9uUHJvbXB0KG5vcm1hbGl6ZWRQYXlsb2FkLmZpbGVOYW1lKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlubGluZURhdGE6IHtcbiAgICAgICAgICBtaW1lVHlwZTogbm9ybWFsaXplZFBheWxvYWQubWltZVR5cGUsXG4gICAgICAgICAgZGF0YTogbm9ybWFsaXplZFBheWxvYWQuaW1hZ2VCYXNlNjQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF0sXG4gICAgY29uZmlnOiB7XG4gICAgICB0ZW1wZXJhdHVyZTogMC4xLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlR2VtaW5pSnNvbihyZXN1bHQudGV4dCA/PyAnJyk7XG4gIGNvbnN0IGFzc2V0cyA9IHNhbml0aXplRXh0cmFjdGVkQXNzZXRzKHBhcnNlZCk7XG5cbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByb3V0ZTogRVhUUkFDVF9ST1VURSxcbiAgICBtb2RlOiAnbGl2ZScsXG4gICAgbW9kZWwsXG4gICAgYXNzZXRzLFxuICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3lpbndhaXlldW5nL0RvY3VtZW50cy9QbGF5Z3JvdW5kL1BvcnRmb2xpb19WMi9zZXJ2ZXIvdXBkYXRlUHJpY2VzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyL3VwZGF0ZVByaWNlcy50c1wiO2ltcG9ydCB7IEdvb2dsZUdlbkFJIH0gZnJvbSAnQGdvb2dsZS9nZW5haSc7XG5cbmltcG9ydCB0eXBlIHtcbiAgUGVuZGluZ1ByaWNlVXBkYXRlUmV2aWV3LFxuICBQcmljZVVwZGF0ZU1vZGVsUmVzdWx0LFxuICBQcmljZVVwZGF0ZVJlcXVlc3QsXG4gIFByaWNlVXBkYXRlUmVxdWVzdEFzc2V0LFxuICBQcmljZVVwZGF0ZVJlc3BvbnNlLFxufSBmcm9tICcuLi9zcmMvdHlwZXMvcHJpY2VVcGRhdGVzJztcbmltcG9ydCB0eXBlIHsgQXNzZXRUeXBlIH0gZnJvbSAnLi4vc3JjL3R5cGVzL3BvcnRmb2xpbyc7XG5cbmNvbnN0IFVQREFURV9QUklDRVNfUk9VVEUgPSAnL2FwaS91cGRhdGUtcHJpY2VzJyBhcyBjb25zdDtcbmNvbnN0IERFRkFVTFRfUFJJQ0VfTU9ERUwgPSAnZ2VtaW5pLTMuMS1mbGFzaC1saXRlJztcbmNvbnN0IERFRkFVTFRfUkVWSUVXX1RIUkVTSE9MRCA9IDAuMTU7XG5cbmNsYXNzIFVwZGF0ZVByaWNlc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBzdGF0dXM6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHN0YXR1cyA9IDUwMCkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdVcGRhdGVQcmljZXNFcnJvcic7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXM7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJpY2VVcGRhdGVNb2RlbCgpIHtcbiAgcmV0dXJuIHByb2Nlc3MuZW52LkdFTUlOSV9QUklDRV9VUERBVEVfTU9ERUw/LnRyaW0oKSB8fCBERUZBVUxUX1BSSUNFX01PREVMO1xufVxuXG5mdW5jdGlvbiBnZXRSZXZpZXdUaHJlc2hvbGQoKSB7XG4gIGNvbnN0IHJhdyA9IE51bWJlcihwcm9jZXNzLmVudi5QUklDRV9VUERBVEVfUkVWSUVXX1RIUkVTSE9MRF9QQ1QpO1xuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHJhdykgJiYgcmF3ID4gMCA/IHJhdyA6IERFRkFVTFRfUkVWSUVXX1RIUkVTSE9MRDtcbn1cblxuZnVuY3Rpb24gZ2V0R2VtaW5pQXBpS2V5KCkge1xuICBjb25zdCBhcGlLZXkgPSBwcm9jZXNzLmVudi5HRU1JTklfQVBJX0tFWT8udHJpbSgpIHx8IHByb2Nlc3MuZW52LkdPT0dMRV9BUElfS0VZPy50cmltKCk7XG5cbiAgaWYgKCFhcGlLZXkpIHtcbiAgICB0aHJvdyBuZXcgVXBkYXRlUHJpY2VzRXJyb3IoXG4gICAgICAnXHU2NzJBXHU4QTJEXHU1QjlBIEdFTUlOSV9BUElfS0VZIFx1NjIxNiBHT09HTEVfQVBJX0tFWVx1RkYwQ1x1NjZBQlx1NjY0Mlx1NzEyMVx1NkNENVx1NTdGN1x1ODg0QyBBSSBcdTUwRjlcdTY4M0NcdTY2RjRcdTY1QjBcdTMwMDInLFxuICAgICAgNTAwLFxuICAgICk7XG4gIH1cblxuICByZXR1cm4gYXBpS2V5O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVSZXF1ZXN0KHBheWxvYWQ6IHVua25vd24pOiBQcmljZVVwZGF0ZVJlcXVlc3Qge1xuICBpZiAoXG4gICAgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnIHx8XG4gICAgcGF5bG9hZCA9PT0gbnVsbCB8fFxuICAgICEoJ2Fzc2V0cycgaW4gcGF5bG9hZCkgfHxcbiAgICAhQXJyYXkuaXNBcnJheShwYXlsb2FkLmFzc2V0cylcbiAgKSB7XG4gICAgdGhyb3cgbmV3IFVwZGF0ZVByaWNlc0Vycm9yKCdcdTUwRjlcdTY4M0NcdTY2RjRcdTY1QjBcdThBQ0JcdTZDNDJcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdTMwMDInLCA0MDApO1xuICB9XG5cbiAgY29uc3QgYXNzZXRzID0gcGF5bG9hZC5hc3NldHNcbiAgICAubWFwKChhc3NldCkgPT4gbm9ybWFsaXplUmVxdWVzdEFzc2V0KGFzc2V0KSlcbiAgICAuZmlsdGVyKChhc3NldCk6IGFzc2V0IGlzIFByaWNlVXBkYXRlUmVxdWVzdEFzc2V0ID0+IGFzc2V0ICE9PSBudWxsKTtcblxuICBpZiAoYXNzZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBVcGRhdGVQcmljZXNFcnJvcignXHU2NzJBXHU2M0QwXHU0RjlCXHU1M0VGXHU2NkY0XHU2NUIwXHU3Njg0XHU4Q0M3XHU3NTIyXHUzMDAyJywgNDAwKTtcbiAgfVxuXG4gIHJldHVybiB7IGFzc2V0cyB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVSZXF1ZXN0QXNzZXQoYXNzZXQ6IHVua25vd24pOiBQcmljZVVwZGF0ZVJlcXVlc3RBc3NldCB8IG51bGwge1xuICBpZiAodHlwZW9mIGFzc2V0ICE9PSAnb2JqZWN0JyB8fCBhc3NldCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgdmFsdWUgPSBhc3NldCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICBpZiAoXG4gICAgdHlwZW9mIHZhbHVlLmFzc2V0SWQgIT09ICdzdHJpbmcnIHx8XG4gICAgdHlwZW9mIHZhbHVlLmFzc2V0TmFtZSAhPT0gJ3N0cmluZycgfHxcbiAgICB0eXBlb2YgdmFsdWUudGlja2VyICE9PSAnc3RyaW5nJyB8fFxuICAgIHR5cGVvZiB2YWx1ZS5hc3NldFR5cGUgIT09ICdzdHJpbmcnIHx8XG4gICAgdHlwZW9mIHZhbHVlLmN1cnJlbnRQcmljZSAhPT0gJ251bWJlcicgfHxcbiAgICB0eXBlb2YgdmFsdWUuY3VycmVuY3kgIT09ICdzdHJpbmcnXG4gICkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhc3NldElkOiB2YWx1ZS5hc3NldElkLFxuICAgIGFzc2V0TmFtZTogdmFsdWUuYXNzZXROYW1lLFxuICAgIHRpY2tlcjogdmFsdWUudGlja2VyLFxuICAgIGFzc2V0VHlwZTogbm9ybWFsaXplQXNzZXRUeXBlKHZhbHVlLmFzc2V0VHlwZSksXG4gICAgY3VycmVudFByaWNlOiB2YWx1ZS5jdXJyZW50UHJpY2UsXG4gICAgY3VycmVuY3k6IHZhbHVlLmN1cnJlbmN5LnRyaW0oKS50b1VwcGVyQ2FzZSgpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBc3NldFR5cGUodmFsdWU6IHN0cmluZyk6IEFzc2V0VHlwZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdzdG9jaycpIHJldHVybiAnc3RvY2snO1xuICBpZiAobm9ybWFsaXplZCA9PT0gJ2V0ZicpIHJldHVybiAnZXRmJztcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdib25kJykgcmV0dXJuICdib25kJztcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdjcnlwdG8nKSByZXR1cm4gJ2NyeXB0byc7XG4gIHJldHVybiAnY2FzaCc7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplU3RyaW5nKHZhbHVlOiB1bmtub3duKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB0cmltbWVkID0gdmFsdWUudHJpbSgpO1xuICByZXR1cm4gdHJpbW1lZCA/IHRyaW1tZWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZU51bWJlcih2YWx1ZTogdW5rbm93bikge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUucmVwbGFjZSgvLC9nLCAnJykudHJpbSgpKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplQXNzZXRUeXBlKHZhbHVlOiB1bmtub3duKTogQXNzZXRUeXBlIHwgbnVsbCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChub3JtYWxpemVkID09PSAnc3RvY2snKSByZXR1cm4gJ3N0b2NrJztcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdldGYnKSByZXR1cm4gJ2V0Zic7XG4gIGlmIChub3JtYWxpemVkID09PSAnYm9uZCcpIHJldHVybiAnYm9uZCc7XG4gIGlmIChub3JtYWxpemVkID09PSAnY3J5cHRvJykgcmV0dXJuICdjcnlwdG8nO1xuICBpZiAobm9ybWFsaXplZCA9PT0gJ2Nhc2gnKSByZXR1cm4gJ2Nhc2gnO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVDb25maWRlbmNlKHZhbHVlOiB1bmtub3duKSB7XG4gIGNvbnN0IHBhcnNlZCA9IHNhbml0aXplTnVtYmVyKHZhbHVlKTtcbiAgaWYgKHBhcnNlZCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgocGFyc2VkLCAwKSwgMSk7XG59XG5cbmZ1bmN0aW9uIHN0cmlwSnNvbkZlbmNlKHRleHQ6IHN0cmluZykge1xuICBjb25zdCB0cmltbWVkID0gdGV4dC50cmltKCk7XG4gIGlmICghdHJpbW1lZC5zdGFydHNXaXRoKCdgYGAnKSkge1xuICAgIHJldHVybiB0cmltbWVkO1xuICB9XG5cbiAgcmV0dXJuIHRyaW1tZWRcbiAgICAucmVwbGFjZSgvXmBgYGpzb25cXHMqL2ksICcnKVxuICAgIC5yZXBsYWNlKC9eYGBgXFxzKi9pLCAnJylcbiAgICAucmVwbGFjZSgvXFxzKmBgYCQvLCAnJylcbiAgICAudHJpbSgpO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1vZGVsSnNvbih0ZXh0OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShzdHJpcEpzb25GZW5jZSh0ZXh0KSkgYXMgdW5rbm93bjtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IFVwZGF0ZVByaWNlc0Vycm9yKCdHZW1pbmkgXHU2NzJBXHU1NkRFXHU1MEIzXHU1M0VGXHU4OUUzXHU2NzkwXHU3Njg0IEpTT05cdUZGMENcdThBQ0JcdTdBMERcdTVGOENcdTUxOERcdThBNjZcdTMwMDInLCA1MDIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplUHJpY2VVcGRhdGVSZXN1bHRzKHJhd1BheWxvYWQ6IHVua25vd24pIHtcbiAgaWYgKFxuICAgIHR5cGVvZiByYXdQYXlsb2FkICE9PSAnb2JqZWN0JyB8fFxuICAgIHJhd1BheWxvYWQgPT09IG51bGwgfHxcbiAgICAhKCdyZXN1bHRzJyBpbiByYXdQYXlsb2FkKSB8fFxuICAgICFBcnJheS5pc0FycmF5KHJhd1BheWxvYWQucmVzdWx0cylcbiAgKSB7XG4gICAgdGhyb3cgbmV3IFVwZGF0ZVByaWNlc0Vycm9yKCdHZW1pbmkgXHU1NkRFXHU1MEIzXHU2ODNDXHU1RjBGXHU0RTBEXHU2QjYzXHU3OEJBXHVGRjBDXHU2NzJBXHU2MjdFXHU1MjMwIHJlc3VsdHMgXHU5NjYzXHU1MjE3XHUzMDAyJywgNTAyKTtcbiAgfVxuXG4gIHJldHVybiByYXdQYXlsb2FkLnJlc3VsdHMubWFwKChpdGVtKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPVxuICAgICAgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmIGl0ZW0gIT09IG51bGwgPyAoaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgOiB7fTtcblxuICAgIHJldHVybiB7XG4gICAgICBhc3NldE5hbWU6IHNhbml0aXplU3RyaW5nKHZhbHVlLmFzc2V0TmFtZSksXG4gICAgICB0aWNrZXI6IHNhbml0aXplU3RyaW5nKHZhbHVlLnRpY2tlciksXG4gICAgICBhc3NldFR5cGU6IHNhbml0aXplQXNzZXRUeXBlKHZhbHVlLmFzc2V0VHlwZSksXG4gICAgICBwcmljZTogc2FuaXRpemVOdW1iZXIodmFsdWUucHJpY2UpLFxuICAgICAgY3VycmVuY3k6IHNhbml0aXplU3RyaW5nKHZhbHVlLmN1cnJlbmN5KT8udG9VcHBlckNhc2UoKSA/PyBudWxsLFxuICAgICAgYXNPZjogc2FuaXRpemVTdHJpbmcodmFsdWUuYXNPZiksXG4gICAgICBzb3VyY2VOYW1lOiBzYW5pdGl6ZVN0cmluZyh2YWx1ZS5zb3VyY2VOYW1lKSxcbiAgICAgIHNvdXJjZVVybDogc2FuaXRpemVTdHJpbmcodmFsdWUuc291cmNlVXJsKSxcbiAgICAgIGNvbmZpZGVuY2U6IHNhbml0aXplQ29uZmlkZW5jZSh2YWx1ZS5jb25maWRlbmNlKSxcbiAgICAgIG5lZWRzUmV2aWV3OiBCb29sZWFuKHZhbHVlLm5lZWRzUmV2aWV3KSxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYnVpbGRQcm9tcHQoYXNzZXRzOiBQcmljZVVwZGF0ZVJlcXVlc3RBc3NldFtdKSB7XG4gIHJldHVybiBgXG5Zb3UgYXJlIGFuIEFJIHByaWNlIHVwZGF0ZSBhc3Npc3RhbnQuXG5cblJldHVybiBPTkxZIHJhdyBKU09OLiBEbyBub3QgdXNlIG1hcmtkb3duIGZlbmNlcy4gRG8gbm90IGluY2x1ZGUgYW55IGV4cGxhbmF0aW9uLlxuXG5Vc2UgdGhpcyBleGFjdCBzY2hlbWE6XG57XG4gIFwicmVzdWx0c1wiOiBbXG4gICAge1xuICAgICAgXCJhc3NldE5hbWVcIjogc3RyaW5nLFxuICAgICAgXCJ0aWNrZXJcIjogc3RyaW5nLFxuICAgICAgXCJhc3NldFR5cGVcIjogXCJzdG9ja1wiIHwgXCJldGZcIiB8IFwiYm9uZFwiIHwgXCJjcnlwdG9cIiB8IFwiY2FzaFwiLFxuICAgICAgXCJwcmljZVwiOiBudW1iZXIsXG4gICAgICBcImN1cnJlbmN5XCI6IHN0cmluZyxcbiAgICAgIFwiYXNPZlwiOiBzdHJpbmcsXG4gICAgICBcInNvdXJjZU5hbWVcIjogc3RyaW5nLFxuICAgICAgXCJzb3VyY2VVcmxcIjogc3RyaW5nLFxuICAgICAgXCJjb25maWRlbmNlXCI6IG51bWJlcixcbiAgICAgIFwibmVlZHNSZXZpZXdcIjogYm9vbGVhblxuICAgIH1cbiAgXVxufVxuXG5SdWxlczpcbi0gUmV0dXJuIGV4YWN0bHkgb25lIHJlc3VsdCBmb3IgZWFjaCBpbnB1dCBhc3NldC5cbi0gS2VlcCBhc3NldE5hbWUsIHRpY2tlciwgYXNzZXRUeXBlLCBhbmQgY3VycmVuY3kgYWxpZ25lZCB3aXRoIHRoZSBpbnB1dCBhc3NldCB1bmxlc3MgYSBjb3JyZWN0aW9uIGlzIGNsZWFybHkgbmVlZGVkLlxuLSBwcmljZSBtdXN0IGJlIHRoZSBsYXRlc3QgcmVhc29uYWJsZSBtYXJrZXQgcHJpY2UgcGVyIHVuaXQuXG4tIGFzT2YgbXVzdCBiZSBhbiBJU08tODYwMSBkYXRldGltZSBzdHJpbmcgaWYgcG9zc2libGUuXG4tIHNvdXJjZU5hbWUgc2hvdWxkIGlkZW50aWZ5IHRoZSBzb3VyY2UgdXNlZC5cbi0gc291cmNlVXJsIHNob3VsZCBiZSBhIGRpcmVjdCBzb3VyY2UgVVJMIHdoZW4gcG9zc2libGUuXG4tIGNvbmZpZGVuY2UgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDEuXG4tIG5lZWRzUmV2aWV3IHNob3VsZCBiZSB0cnVlIGlmIHRoZSByZXN1bHQgaXMgdW5jZXJ0YWluLCBzdGFsZSwgc291cmNlIGlzIHdlYWssIG9yIHByaWNlIG1heSBiZSB1bnJlbGlhYmxlLlxuLSBObyBleHRyYSBmaWVsZHMuXG5cbklucHV0IGFzc2V0czpcbiR7SlNPTi5zdHJpbmdpZnkoYXNzZXRzLCBudWxsLCAyKX1cbiAgYC50cmltKCk7XG59XG5cbmNvbnN0IHJlc3BvbnNlSnNvblNjaGVtYSA9IHtcbiAgdHlwZTogJ29iamVjdCcsXG4gIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgcmVxdWlyZWQ6IFsncmVzdWx0cyddLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgcmVzdWx0czoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXG4gICAgICAgIHJlcXVpcmVkOiBbXG4gICAgICAgICAgJ2Fzc2V0TmFtZScsXG4gICAgICAgICAgJ3RpY2tlcicsXG4gICAgICAgICAgJ2Fzc2V0VHlwZScsXG4gICAgICAgICAgJ3ByaWNlJyxcbiAgICAgICAgICAnY3VycmVuY3knLFxuICAgICAgICAgICdhc09mJyxcbiAgICAgICAgICAnc291cmNlTmFtZScsXG4gICAgICAgICAgJ3NvdXJjZVVybCcsXG4gICAgICAgICAgJ2NvbmZpZGVuY2UnLFxuICAgICAgICAgICduZWVkc1JldmlldycsXG4gICAgICAgIF0sXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBhc3NldE5hbWU6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICB0aWNrZXI6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICBhc3NldFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnc3RvY2snLCAnZXRmJywgJ2JvbmQnLCAnY3J5cHRvJywgJ2Nhc2gnXSB9LFxuICAgICAgICAgIHByaWNlOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgY3VycmVuY3k6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICBhc09mOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgc291cmNlTmFtZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIHNvdXJjZVVybDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIGNvbmZpZGVuY2U6IHsgdHlwZTogJ251bWJlcicsIG1pbmltdW06IDAsIG1heGltdW06IDEgfSxcbiAgICAgICAgICBuZWVkc1JldmlldzogeyB0eXBlOiAnYm9vbGVhbicgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0gYXMgY29uc3Q7XG5cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlUHJpY2VSZXNwb25zZVdpdGhGYWxsYmFjayhcbiAgYWk6IEdvb2dsZUdlbkFJLFxuICBtb2RlbDogc3RyaW5nLFxuICBwcm9tcHQ6IHN0cmluZyxcbikge1xuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCBhaS5tb2RlbHMuZ2VuZXJhdGVDb250ZW50KHtcbiAgICAgIG1vZGVsLFxuICAgICAgY29udGVudHM6IHByb21wdCxcbiAgICAgIGNvbmZpZzoge1xuICAgICAgICB0ZW1wZXJhdHVyZTogMC4xLFxuICAgICAgICByZXNwb25zZU1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHJlc3BvbnNlSnNvblNjaGVtYSxcbiAgICAgICAgdG9vbHM6IFt7IGdvb2dsZVNlYXJjaDoge30gfV0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYWkubW9kZWxzLmdlbmVyYXRlQ29udGVudCh7XG4gICAgICBtb2RlbCxcbiAgICAgIGNvbnRlbnRzOiBwcm9tcHQsXG4gICAgICBjb25maWc6IHtcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuMSxcbiAgICAgICAgcmVzcG9uc2VNaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICByZXNwb25zZUpzb25TY2hlbWEsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUmV2aWV3UmVzdWx0cyhcbiAgcmVxdWVzdGVkQXNzZXRzOiBQcmljZVVwZGF0ZVJlcXVlc3RBc3NldFtdLFxuICBtb2RlbFJlc3VsdHM6IFByaWNlVXBkYXRlTW9kZWxSZXN1bHRbXSxcbik6IFBlbmRpbmdQcmljZVVwZGF0ZVJldmlld1tdIHtcbiAgY29uc3QgdGhyZXNob2xkID0gZ2V0UmV2aWV3VGhyZXNob2xkKCk7XG5cbiAgcmV0dXJuIHJlcXVlc3RlZEFzc2V0cy5tYXAoKGFzc2V0LCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IG1hdGNoZWQgPVxuICAgICAgbW9kZWxSZXN1bHRzLmZpbmQoXG4gICAgICAgIChpdGVtKSA9PlxuICAgICAgICAgIGl0ZW0udGlja2VyPy50b1VwcGVyQ2FzZSgpID09PSBhc3NldC50aWNrZXIudG9VcHBlckNhc2UoKSB8fFxuICAgICAgICAgIGl0ZW0uYXNzZXROYW1lPy50b0xvd2VyQ2FzZSgpID09PSBhc3NldC5hc3NldE5hbWUudG9Mb3dlckNhc2UoKSxcbiAgICAgICkgPz8gbW9kZWxSZXN1bHRzW2luZGV4XTtcblxuICAgIGNvbnN0IG5leHRQcmljZSA9IG1hdGNoZWQ/LnByaWNlID8/IG51bGw7XG4gICAgY29uc3QgZGlmZlBjdCA9XG4gICAgICBuZXh0UHJpY2UgIT0gbnVsbCAmJiBhc3NldC5jdXJyZW50UHJpY2UgPiAwXG4gICAgICAgID8gTWF0aC5hYnMobmV4dFByaWNlIC0gYXNzZXQuY3VycmVudFByaWNlKSAvIGFzc2V0LmN1cnJlbnRQcmljZVxuICAgICAgICA6IDA7XG5cbiAgICBjb25zdCBmb3JjZWROZWVkc1JldmlldyA9XG4gICAgICBuZXh0UHJpY2UgPT0gbnVsbCB8fFxuICAgICAgbmV4dFByaWNlIDw9IDAgfHxcbiAgICAgIGRpZmZQY3QgPj0gdGhyZXNob2xkIHx8XG4gICAgICAhbWF0Y2hlZD8uc291cmNlTmFtZSB8fFxuICAgICAgIW1hdGNoZWQ/LnNvdXJjZVVybCB8fFxuICAgICAgKG1hdGNoZWQ/LmNvbmZpZGVuY2UgPz8gMCkgPCAwLjc1O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBhc3NldC5hc3NldElkLFxuICAgICAgYXNzZXRJZDogYXNzZXQuYXNzZXRJZCxcbiAgICAgIGFzc2V0TmFtZTogbWF0Y2hlZD8uYXNzZXROYW1lID8/IGFzc2V0LmFzc2V0TmFtZSxcbiAgICAgIHRpY2tlcjogbWF0Y2hlZD8udGlja2VyPy50b1VwcGVyQ2FzZSgpID8/IGFzc2V0LnRpY2tlci50b1VwcGVyQ2FzZSgpLFxuICAgICAgYXNzZXRUeXBlOiBtYXRjaGVkPy5hc3NldFR5cGUgPz8gYXNzZXQuYXNzZXRUeXBlLFxuICAgICAgcHJpY2U6IG5leHRQcmljZSxcbiAgICAgIGN1cnJlbmN5OiBtYXRjaGVkPy5jdXJyZW5jeT8udG9VcHBlckNhc2UoKSA/PyBhc3NldC5jdXJyZW5jeSxcbiAgICAgIGFzT2Y6IG1hdGNoZWQ/LmFzT2YgPz8gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgc291cmNlTmFtZTogbWF0Y2hlZD8uc291cmNlTmFtZSA/PyAnJyxcbiAgICAgIHNvdXJjZVVybDogbWF0Y2hlZD8uc291cmNlVXJsID8/ICcnLFxuICAgICAgY29uZmlkZW5jZTogbWF0Y2hlZD8uY29uZmlkZW5jZSA/PyAwLFxuICAgICAgbmVlZHNSZXZpZXc6IEJvb2xlYW4obWF0Y2hlZD8ubmVlZHNSZXZpZXcpIHx8IGZvcmNlZE5lZWRzUmV2aWV3LFxuICAgICAgY3VycmVudFByaWNlOiBhc3NldC5jdXJyZW50UHJpY2UsXG4gICAgICBkaWZmUGN0LFxuICAgICAgc3RhdHVzOiAncGVuZGluZycsXG4gICAgfTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRVcGRhdGVQcmljZXNFcnJvclJlc3BvbnNlKGVycm9yOiB1bmtub3duKSB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIFVwZGF0ZVByaWNlc0Vycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogZXJyb3Iuc3RhdHVzLFxuICAgICAgYm9keToge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIHJvdXRlOiBVUERBVEVfUFJJQ0VTX1JPVVRFLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBib2R5OiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgcm91dGU6IFVQREFURV9QUklDRVNfUk9VVEUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN0YXR1czogNTAwLFxuICAgIGJvZHk6IHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIHJvdXRlOiBVUERBVEVfUFJJQ0VTX1JPVVRFLFxuICAgICAgbWVzc2FnZTogJ0FJIFx1NTBGOVx1NjgzQ1x1NjZGNFx1NjVCMFx1NTkzMVx1NjU1N1x1RkYwQ1x1OEFDQlx1N0EwRFx1NUY4Q1x1NTE4RFx1OEE2Nlx1MzAwMicsXG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlUHJpY2VVcGRhdGVzKHBheWxvYWQ6IHVua25vd24pIHtcbiAgY29uc3QgcmVxdWVzdCA9IG5vcm1hbGl6ZVJlcXVlc3QocGF5bG9hZCk7XG4gIGNvbnN0IGFwaUtleSA9IGdldEdlbWluaUFwaUtleSgpO1xuICBjb25zdCBtb2RlbCA9IGdldFByaWNlVXBkYXRlTW9kZWwoKTtcbiAgY29uc3QgYWkgPSBuZXcgR29vZ2xlR2VuQUkoeyBhcGlLZXkgfSk7XG4gIGNvbnN0IHByb21wdCA9IGJ1aWxkUHJvbXB0KHJlcXVlc3QuYXNzZXRzKTtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBnZW5lcmF0ZVByaWNlUmVzcG9uc2VXaXRoRmFsbGJhY2soYWksIG1vZGVsLCBwcm9tcHQpO1xuICBjb25zdCByYXcgPSBwYXJzZU1vZGVsSnNvbihyZXNwb25zZS50ZXh0ID8/ICcnKTtcbiAgY29uc3Qgc2FuaXRpemVkUmVzdWx0cyA9IHNhbml0aXplUHJpY2VVcGRhdGVSZXN1bHRzKHJhdyk7XG4gIGNvbnN0IHJlc3VsdHMgPSBidWlsZFJldmlld1Jlc3VsdHMocmVxdWVzdC5hc3NldHMsIHNhbml0aXplZFJlc3VsdHMpO1xuXG4gIHJldHVybiB7XG4gICAgb2s6IHRydWUsXG4gICAgcm91dGU6IFVQREFURV9QUklDRVNfUk9VVEUsXG4gICAgbW9kZTogJ2xpdmUnLFxuICAgIG1vZGVsLFxuICAgIHJlc3VsdHMsXG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyL3NlcnZlci9maXJlYmFzZUFkbWluLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyL2ZpcmViYXNlQWRtaW4udHNcIjtpbXBvcnQgeyBjZXJ0LCBnZXRBcHAsIGdldEFwcHMsIGluaXRpYWxpemVBcHAgfSBmcm9tICdmaXJlYmFzZS1hZG1pbi9hcHAnO1xuaW1wb3J0IHsgZ2V0QXV0aCB9IGZyb20gJ2ZpcmViYXNlLWFkbWluL2F1dGgnO1xuXG5jb25zdCBBRE1JTl9FTlZfS0VZUyA9IFtcbiAgJ0ZJUkVCQVNFX0FETUlOX1BST0pFQ1RfSUQnLFxuICAnRklSRUJBU0VfQURNSU5fQ0xJRU5UX0VNQUlMJyxcbiAgJ0ZJUkVCQVNFX0FETUlOX1BSSVZBVEVfS0VZJyxcbl0gYXMgY29uc3Q7XG5cbmludGVyZmFjZSBGaXJlYmFzZUFkbWluU2VydmljZUFjY291bnQge1xuICBwcm9qZWN0SWQ6IHN0cmluZztcbiAgY2xpZW50RW1haWw6IHN0cmluZztcbiAgcHJpdmF0ZUtleTogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVQcml2YXRlS2V5KHZhbHVlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKS50cmltKCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRTZXJ2aWNlQWNjb3VudEZyb21Kc29uKCk6IEZpcmViYXNlQWRtaW5TZXJ2aWNlQWNjb3VudCB8IG51bGwge1xuICBjb25zdCByYXcgPSBwcm9jZXNzLmVudi5GSVJFQkFTRV9BRE1JTl9TRVJWSUNFX0FDQ09VTlRfSlNPTj8udHJpbSgpO1xuXG4gIGlmICghcmF3KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBsZXQgcGFyc2VkOiB1bmtub3duO1xuXG4gIHRyeSB7XG4gICAgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZJUkVCQVNFX0FETUlOX1NFUlZJQ0VfQUNDT1VOVF9KU09OIFx1NEUwRFx1NjYyRlx1NjcwOVx1NjU0OFx1NzY4NCBKU09OXHUzMDAyJyk7XG4gIH1cblxuICBpZiAodHlwZW9mIHBhcnNlZCAhPT0gJ29iamVjdCcgfHwgcGFyc2VkID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGSVJFQkFTRV9BRE1JTl9TRVJWSUNFX0FDQ09VTlRfSlNPTiBcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdTMwMDInKTtcbiAgfVxuXG4gIGNvbnN0IHZhbHVlID0gcGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjb25zdCBwcm9qZWN0SWQgPVxuICAgIHR5cGVvZiB2YWx1ZS5wcm9qZWN0X2lkID09PSAnc3RyaW5nJ1xuICAgICAgPyB2YWx1ZS5wcm9qZWN0X2lkLnRyaW0oKVxuICAgICAgOiB0eXBlb2YgdmFsdWUucHJvamVjdElkID09PSAnc3RyaW5nJ1xuICAgICAgICA/IHZhbHVlLnByb2plY3RJZC50cmltKClcbiAgICAgICAgOiAnJztcbiAgY29uc3QgY2xpZW50RW1haWwgPVxuICAgIHR5cGVvZiB2YWx1ZS5jbGllbnRfZW1haWwgPT09ICdzdHJpbmcnXG4gICAgICA/IHZhbHVlLmNsaWVudF9lbWFpbC50cmltKClcbiAgICAgIDogdHlwZW9mIHZhbHVlLmNsaWVudEVtYWlsID09PSAnc3RyaW5nJ1xuICAgICAgICA/IHZhbHVlLmNsaWVudEVtYWlsLnRyaW0oKVxuICAgICAgICA6ICcnO1xuICBjb25zdCBwcml2YXRlS2V5ID1cbiAgICB0eXBlb2YgdmFsdWUucHJpdmF0ZV9rZXkgPT09ICdzdHJpbmcnXG4gICAgICA/IG5vcm1hbGl6ZVByaXZhdGVLZXkodmFsdWUucHJpdmF0ZV9rZXkpXG4gICAgICA6IHR5cGVvZiB2YWx1ZS5wcml2YXRlS2V5ID09PSAnc3RyaW5nJ1xuICAgICAgICA/IG5vcm1hbGl6ZVByaXZhdGVLZXkodmFsdWUucHJpdmF0ZUtleSlcbiAgICAgICAgOiAnJztcblxuICBpZiAoIXByb2plY3RJZCB8fCAhY2xpZW50RW1haWwgfHwgIXByaXZhdGVLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnRklSRUJBU0VfQURNSU5fU0VSVklDRV9BQ0NPVU5UX0pTT04gXHU3RjNBXHU1QzExIHByb2plY3RfaWRcdTMwMDFjbGllbnRfZW1haWwgXHU2MjE2IHByaXZhdGVfa2V5XHUzMDAyJyxcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwcm9qZWN0SWQsXG4gICAgY2xpZW50RW1haWwsXG4gICAgcHJpdmF0ZUtleSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVhZFNlcnZpY2VBY2NvdW50RnJvbUVudigpOiBGaXJlYmFzZUFkbWluU2VydmljZUFjY291bnQgfCBudWxsIHtcbiAgY29uc3QgcHJvamVjdElkID1cbiAgICBwcm9jZXNzLmVudi5GSVJFQkFTRV9BRE1JTl9QUk9KRUNUX0lEPy50cmltKCkgfHxcbiAgICBwcm9jZXNzLmVudi5WSVRFX0ZJUkVCQVNFX1BST0pFQ1RfSUQ/LnRyaW0oKSB8fFxuICAgICcnO1xuICBjb25zdCBjbGllbnRFbWFpbCA9IHByb2Nlc3MuZW52LkZJUkVCQVNFX0FETUlOX0NMSUVOVF9FTUFJTD8udHJpbSgpIHx8ICcnO1xuICBjb25zdCBwcml2YXRlS2V5ID0gbm9ybWFsaXplUHJpdmF0ZUtleShwcm9jZXNzLmVudi5GSVJFQkFTRV9BRE1JTl9QUklWQVRFX0tFWSA/PyAnJyk7XG5cbiAgaWYgKCFwcm9qZWN0SWQgJiYgIWNsaWVudEVtYWlsICYmICFwcml2YXRlS2V5KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoIXByb2plY3RJZCB8fCAhY2xpZW50RW1haWwgfHwgIXByaXZhdGVLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRmlyZWJhc2UgQWRtaW4gXHU4QTJEXHU1QjlBXHU0RTBEXHU1QjhDXHU2NTc0XHUzMDAyXHU4QUNCXHU4OERDXHU0RTBBICR7QURNSU5fRU5WX0tFWVMuam9pbignXHUzMDAxJyl9XHVGRjBDXHU2MjE2XHU2NTM5XHU3NTI4IEZJUkVCQVNFX0FETUlOX1NFUlZJQ0VfQUNDT1VOVF9KU09OXHUzMDAyYCxcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwcm9qZWN0SWQsXG4gICAgY2xpZW50RW1haWwsXG4gICAgcHJpdmF0ZUtleSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlyZWJhc2VBZG1pblNlcnZpY2VBY2NvdW50KCkge1xuICByZXR1cm4gcmVhZFNlcnZpY2VBY2NvdW50RnJvbUpzb24oKSA/PyByZWFkU2VydmljZUFjY291bnRGcm9tRW52KCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaXJlYmFzZUFkbWluU2V0dXBFcnJvck1lc3NhZ2UoZXJyb3I/OiB1bmtub3duKSB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG4gIH1cblxuICByZXR1cm4gYFx1NjcyQVx1OEEyRFx1NUI5QSBGaXJlYmFzZSBBZG1pbiBcdTYxOTFcdThCNDlcdTMwMDJcdThBQ0JcdThBMkRcdTVCOUEgRklSRUJBU0VfQURNSU5fU0VSVklDRV9BQ0NPVU5UX0pTT05cdUZGMENcdTYyMTYgJHtBRE1JTl9FTlZfS0VZUy5qb2luKCdcdTMwMDEnKX1cdTMwMDJgO1xufVxuXG5mdW5jdGlvbiBnZXRGaXJlYmFzZUFkbWluQXBwKCkge1xuICBpZiAoZ2V0QXBwcygpLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gZ2V0QXBwKCk7XG4gIH1cblxuICBjb25zdCBzZXJ2aWNlQWNjb3VudCA9IGdldEZpcmViYXNlQWRtaW5TZXJ2aWNlQWNjb3VudCgpO1xuXG4gIGlmICghc2VydmljZUFjY291bnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgXHU2NzJBXHU4QTJEXHU1QjlBIEZpcmViYXNlIEFkbWluIFx1NjE5MVx1OEI0OVx1MzAwMlx1OEFDQlx1OEEyRFx1NUI5QSBGSVJFQkFTRV9BRE1JTl9TRVJWSUNFX0FDQ09VTlRfSlNPTlx1RkYwQ1x1NjIxNiAke0FETUlOX0VOVl9LRVlTLmpvaW4oJ1x1MzAwMScpfVx1MzAwMmAsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBpbml0aWFsaXplQXBwKHtcbiAgICBjcmVkZW50aWFsOiBjZXJ0KHNlcnZpY2VBY2NvdW50KSxcbiAgICBwcm9qZWN0SWQ6IHNlcnZpY2VBY2NvdW50LnByb2plY3RJZCxcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2ZXJpZnlGaXJlYmFzZUlkVG9rZW4oaWRUb2tlbjogc3RyaW5nKSB7XG4gIGNvbnN0IGF1dGggPSBnZXRBdXRoKGdldEZpcmViYXNlQWRtaW5BcHAoKSk7XG4gIHJldHVybiBhdXRoLnZlcmlmeUlkVG9rZW4oaWRUb2tlbik7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMveWlud2FpeWV1bmcvRG9jdW1lbnRzL1BsYXlncm91bmQvUG9ydGZvbGlvX1YyL3NlcnZlci9yZXF1aXJlRmlyZWJhc2VVc2VyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy95aW53YWl5ZXVuZy9Eb2N1bWVudHMvUGxheWdyb3VuZC9Qb3J0Zm9saW9fVjIvc2VydmVyL3JlcXVpcmVGaXJlYmFzZVVzZXIudHNcIjtpbXBvcnQgdHlwZSB7IEluY29taW5nTWVzc2FnZSB9IGZyb20gJ25vZGU6aHR0cCc7XG5cbmltcG9ydCB0eXBlIHsgRGVjb2RlZElkVG9rZW4gfSBmcm9tICdmaXJlYmFzZS1hZG1pbi9hdXRoJztcblxuaW1wb3J0IHtcbiAgZ2V0RmlyZWJhc2VBZG1pblNldHVwRXJyb3JNZXNzYWdlLFxuICB2ZXJpZnlGaXJlYmFzZUlkVG9rZW4sXG59IGZyb20gJy4vZmlyZWJhc2VBZG1pbic7XG5cbmNsYXNzIEZpcmViYXNlQXBpQXV0aEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBzdGF0dXM6IG51bWJlcjtcbiAgcm91dGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHJvdXRlOiBzdHJpbmcsIHN0YXR1cyA9IDQwMSkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdGaXJlYmFzZUFwaUF1dGhFcnJvcic7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXM7XG4gICAgdGhpcy5yb3V0ZSA9IHJvdXRlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0ZpcmViYXNlQXBpQXV0aEVycm9yKGVycm9yOiB1bmtub3duKTogZXJyb3IgaXMgRmlyZWJhc2VBcGlBdXRoRXJyb3Ige1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBGaXJlYmFzZUFwaUF1dGhFcnJvcjtcbn1cblxuZnVuY3Rpb24gZ2V0QmVhcmVyVG9rZW4oYXV0aG9yaXphdGlvbkhlYWRlcjogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICBpZiAoIWF1dGhvcml6YXRpb25IZWFkZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01JU1NJTkdfQVVUSF9IRUFERVInKTtcbiAgfVxuXG4gIGNvbnN0IFtzY2hlbWUsIHRva2VuXSA9IGF1dGhvcml6YXRpb25IZWFkZXIudHJpbSgpLnNwbGl0KC9cXHMrLywgMik7XG5cbiAgaWYgKHNjaGVtZT8udG9Mb3dlckNhc2UoKSAhPT0gJ2JlYXJlcicgfHwgIXRva2VuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJTlZBTElEX0FVVEhfSEVBREVSJyk7XG4gIH1cblxuICByZXR1cm4gdG9rZW47XG59XG5cbmZ1bmN0aW9uIGdldE5vZGVBdXRob3JpemF0aW9uSGVhZGVyKHJlcXVlc3Q6IEluY29taW5nTWVzc2FnZSkge1xuICBjb25zdCBoZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcblxuICBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXIpKSB7XG4gICAgcmV0dXJuIGhlYWRlclswXSA/PyBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGhlYWRlciA/PyBudWxsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVxdWlyZUZpcmViYXNlVXNlckZyb21BdXRob3JpemF0aW9uSGVhZGVyKFxuICBhdXRob3JpemF0aW9uSGVhZGVyOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkLFxuICByb3V0ZTogc3RyaW5nLFxuKTogUHJvbWlzZTxEZWNvZGVkSWRUb2tlbj4ge1xuICBsZXQgdG9rZW4gPSAnJztcblxuICB0cnkge1xuICAgIHRva2VuID0gZ2V0QmVhcmVyVG9rZW4oYXV0aG9yaXphdGlvbkhlYWRlcik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyb3IubWVzc2FnZSA9PT0gJ01JU1NJTkdfQVVUSF9IRUFERVInKSB7XG4gICAgICB0aHJvdyBuZXcgRmlyZWJhc2VBcGlBdXRoRXJyb3IoJ1x1N0YzQVx1NUMxMSBGaXJlYmFzZSBJRCB0b2tlblx1RkYwQ1x1OEFDQlx1OTFDRFx1NjVCMFx1NzY3Qlx1NTE2NVx1NUY4Q1x1NTE4RFx1OEE2Nlx1MzAwMicsIHJvdXRlLCA0MDEpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBGaXJlYmFzZUFwaUF1dGhFcnJvcihcbiAgICAgICdBdXRob3JpemF0aW9uIGhlYWRlciBcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4QkFcdUZGMENcdThBQ0JcdTRGN0ZcdTc1MjggQmVhcmVyIHRva2VuXHUzMDAyJyxcbiAgICAgIHJvdXRlLFxuICAgICAgNDAxLFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCB2ZXJpZnlGaXJlYmFzZUlkVG9rZW4odG9rZW4pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IHNldHVwTWVzc2FnZSA9IGdldEZpcmViYXNlQWRtaW5TZXR1cEVycm9yTWVzc2FnZShlcnJvcik7XG5cbiAgICBpZiAoXG4gICAgICBzZXR1cE1lc3NhZ2UuaW5jbHVkZXMoJ1x1NjcyQVx1OEEyRFx1NUI5QSBGaXJlYmFzZSBBZG1pbiBcdTYxOTFcdThCNDknKSB8fFxuICAgICAgc2V0dXBNZXNzYWdlLmluY2x1ZGVzKCdGaXJlYmFzZSBBZG1pbiBcdThBMkRcdTVCOUFcdTRFMERcdTVCOENcdTY1NzQnKSB8fFxuICAgICAgc2V0dXBNZXNzYWdlLmluY2x1ZGVzKCdGSVJFQkFTRV9BRE1JTl9TRVJWSUNFX0FDQ09VTlRfSlNPTicpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRmlyZWJhc2VBcGlBdXRoRXJyb3Ioc2V0dXBNZXNzYWdlLCByb3V0ZSwgNTAwKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRmlyZWJhc2VBcGlBdXRoRXJyb3IoJ0ZpcmViYXNlIElEIHRva2VuIFx1OUE1N1x1OEI0OVx1NTkzMVx1NjU1N1x1RkYwQ1x1OEFDQlx1OTFDRFx1NjVCMFx1NjU3NFx1NzQwNlx1NUY4Q1x1NTE4RFx1OEE2Nlx1MzAwMicsIHJvdXRlLCA0MDEpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlRmlyZWJhc2VVc2VyRnJvbVJlcXVlc3QocmVxdWVzdDogUmVxdWVzdCwgcm91dGU6IHN0cmluZykge1xuICByZXR1cm4gcmVxdWlyZUZpcmViYXNlVXNlckZyb21BdXRob3JpemF0aW9uSGVhZGVyKFxuICAgIHJlcXVlc3QuaGVhZGVycy5nZXQoJ2F1dGhvcml6YXRpb24nKSxcbiAgICByb3V0ZSxcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcXVpcmVGaXJlYmFzZVVzZXJGcm9tTm9kZVJlcXVlc3QoXG4gIHJlcXVlc3Q6IEluY29taW5nTWVzc2FnZSxcbiAgcm91dGU6IHN0cmluZyxcbikge1xuICByZXR1cm4gcmVxdWlyZUZpcmViYXNlVXNlckZyb21BdXRob3JpemF0aW9uSGVhZGVyKGdldE5vZGVBdXRob3JpemF0aW9uSGVhZGVyKHJlcXVlc3QpLCByb3V0ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaXJlYmFzZUFwaUF1dGhFcnJvclJlc3BvbnNlKGVycm9yOiB1bmtub3duLCByb3V0ZTogc3RyaW5nKSB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEZpcmViYXNlQXBpQXV0aEVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1czogZXJyb3Iuc3RhdHVzLFxuICAgICAgYm9keToge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIHJvdXRlLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBib2R5OiB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgcm91dGUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN0YXR1czogNTAwLFxuICAgIGJvZHk6IHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIHJvdXRlLFxuICAgICAgbWVzc2FnZTogJ0ZpcmViYXNlIFx1OUE1N1x1OEI0OVx1NTkzMVx1NjU1N1x1RkYwQ1x1OEFDQlx1N0EwRFx1NUY4Q1x1NTE4RFx1OEE2Nlx1MzAwMicsXG4gICAgfSxcbiAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFUsU0FBUyxjQUFjLGVBQWU7QUFDcFgsT0FBTyxXQUFXOzs7QUNEMlgsU0FBUyxzQkFBc0I7QUFDMWEsU0FBTztBQUFBLElBQ0wsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsV0FBVztBQUFBLEVBQ2I7QUFDRjs7O0FDVDZXLFNBQVMsbUJBQW1CO0FBU3pZLElBQU0sZ0JBQWdCO0FBQ3RCLElBQU0sd0JBQXdCO0FBRTlCLElBQU0sd0JBQU4sY0FBb0MsTUFBTTtBQUFBLEVBQ3hDO0FBQUEsRUFFQSxZQUFZLFNBQWlCLFNBQVMsS0FBSztBQUN6QyxVQUFNLE9BQU87QUFDYixTQUFLLE9BQU87QUFDWixTQUFLLFNBQVM7QUFBQSxFQUNoQjtBQUNGO0FBRUEsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxRQUFRLElBQUksc0JB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QUFDcEQseUJBQVMsVUFBVSxVQUFVLFFBQVEsVUFBVSxJQUFJO0FBQUEsY0FDdkQ7QUFDQTtBQUFBLFlBQ0o7QUFDQSxnQkFBSSxRQUFRLFdBQVcsVUFBVSxhQUFhLGdCQUFnQjtBQUMxRCxrQkFBSTtBQUNBLHNCQUFNLG1DQUFtQyxTQUFTLGNBQWM7QUFDaEUsc0JBQU0sT0FBTyxNQUFNLGFBQWEsT0FBTztBQUN2QyxzQkFBTSxTQUFTLE1BQU0saUJBQWlCLElBQUk7QUFDMUMseUJBQVMsVUFBVSxLQUFLLE1BQU07QUFBQSxjQUNsQyxTQUNPLE9BQU87QUFDVixvQkFBSSx1QkFBdUIsS0FBSyxHQUFHO0FBQy9CLHdCQUFNLFlBQVksZ0NBQWdDLE9BQU8sY0FBYztBQUN2RSwyQkFBUyxVQUFVLFVBQVUsUUFBUSxVQUFVLElBQUk7QUFDbkQ7QUFBQSxnQkFDSjtBQUNBLHNCQUFNLFlBQVksaUNBQWlDLEtBQUs7QUFDeEQseUJBQVMsVUFBVSxVQUFVLFFBQVEsVUFBVSxJQUFJO0FBQUEsY0FDdkQ7QUFDQTtBQUFBLFlBQ0o7QUFDQSxpQkFBSztBQUFBLFVBQ1QsQ0FBQztBQUFBLFFBQ0w7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDO0FBQ0QsZUFBZSxhQUFhLFNBQVM7QUFDakMsUUFBTSxTQUFTLENBQUM7QUFDaEIsbUJBQWlCLFNBQVMsU0FBUztBQUMvQixRQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzNCLGFBQU8sS0FBSyxPQUFPLEtBQUssS0FBSyxDQUFDO0FBQzlCO0FBQUEsSUFDSjtBQUNBLFdBQU8sS0FBSyxLQUFLO0FBQUEsRUFDckI7QUFDQSxRQUFNLFVBQVUsT0FBTyxPQUFPLE1BQU0sRUFBRSxTQUFTLE1BQU0sRUFBRSxLQUFLO0FBQzVELE1BQUksQ0FBQyxTQUFTO0FBQ1YsV0FBTyxDQUFDO0FBQUEsRUFDWjtBQUNBLFNBQU8sS0FBSyxNQUFNLE9BQU87QUFDN0I7IiwKICAibmFtZXMiOiBbIkdvb2dsZUdlbkFJIiwgImdldEdlbWluaUFwaUtleSIsICJzYW5pdGl6ZVN0cmluZyIsICJzYW5pdGl6ZU51bWJlciIsICJzdHJpcEpzb25GZW5jZSIsICJHb29nbGVHZW5BSSIsICJHb29nbGVHZW5BSSIsICJnZXRHZW1pbmlBcGlLZXkiLCAic2FuaXRpemVTdHJpbmciLCAic2FuaXRpemVOdW1iZXIiLCAic2FuaXRpemVBc3NldFR5cGUiLCAic3RyaXBKc29uRmVuY2UiLCAicGFyc2VNb2RlbEpzb24iLCAiYnVpbGRQcm9tcHQiLCAicmVzcG9uc2VKc29uU2NoZW1hIiwgIkdvb2dsZUdlbkFJIl0KfQo=
