const DEFAULT_MODELS = {
  price: "gemini-2.5-flash-lite",
  analysis: "gemini-2.5-flash",
  brief: "gemini-2.5-flash",
};

function getGeminiModels() {
  return {
    price: process.env.GEMINI_PRICE_MODEL || DEFAULT_MODELS.price,
    analysis: process.env.GEMINI_ANALYSIS_MODEL || DEFAULT_MODELS.analysis,
    brief: process.env.GEMINI_BRIEF_MODEL || DEFAULT_MODELS.brief,
  };
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

function getEndpoint(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function extractText(response) {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function extractJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const firstStart = [objectStart, arrayStart].filter((value) => value >= 0).sort((left, right) => left - right)[0];
  if (firstStart === undefined) {
    throw new Error("Gemini 未回傳可解析的 JSON。");
  }

  const objectEnd = text.lastIndexOf("}");
  const arrayEnd = text.lastIndexOf("]");
  const lastEnd = Math.max(objectEnd, arrayEnd);
  if (lastEnd < firstStart) {
    throw new Error("Gemini JSON 回應格式不完整。");
  }

  return text.slice(firstStart, lastEnd + 1);
}

function summarizePortfolio(portfolio) {
  const assets = portfolio?.assets ?? [];
  if (!assets.length) {
    return "目前資產庫為空。";
  }

  return assets
    .map(
      (asset) =>
        `${asset.sourceLabel || asset.source} | ${asset.account_name} | ${asset.symbol} | ${asset.name} | ${asset.asset_type} | 數量 ${asset.quantity} | 成本 ${asset.unit_cost} ${asset.currency} | 現價 ${asset.price} ${asset.currency} | 市值 ${asset.market_value} ${asset.currency}`,
    )
    .join("\n");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function callGemini({ model, prompt, image = null, useGoogleSearch = false, temperature = 0.2, maxOutputTokens = 2048 }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("伺服器尚未設定 Gemini API key。");
  }

  const parts = [{ text: prompt }];
  if (image?.data) {
    parts.push({
      inline_data: {
        mime_type: image.mime_type || "image/png",
        data: image.data,
      },
    });
  }

  const response = await fetch(getEndpoint(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      tools: useGoogleSearch ? [{ google_search: {} }] : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Gemini request failed with status ${response.status}`);
  }

  const text = extractText(payload);
  if (!text) {
    throw new Error("Gemini 未回傳文字內容。");
  }

  return {
    text,
    raw: payload,
  };
}

async function callGeminiJson(options) {
  const { text, raw } = await callGemini(options);
  const jsonBlock = extractJsonBlock(text);
  return {
    data: JSON.parse(jsonBlock),
    text,
    raw,
  };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function createAssistantPrompt({ message, history, portfolio }) {
  return `
你是一個資產管理 AI 助手。請根據用戶訊息、對話歷史和目前資產庫，回傳 JSON。

目前資產庫：
${summarizePortfolio(portfolio)}

對話歷史：
${JSON.stringify(history, null, 2)}

用戶最新訊息：
${message}

如果用戶提供持倉截圖或結構化資料，你可以整理出 suggested_assets。
只回傳 JSON object，不要加 markdown。

JSON 格式：
{
  "reply": "string",
  "insights": ["string"],
  "suggested_assets": [
    {
      "source": "futu|ib|crypto|other",
      "account_name": "string",
      "symbol": "string",
      "quote_symbol": "string",
      "name": "string",
      "asset_type": "stock|etf|fund|cash|crypto|bond|option|other",
      "quantity": 0,
      "unit_cost": 0,
      "price": 0,
      "currency": "HKD|USD|USDT|JPY|CNY|CNH|SGD|AUD|CAD|EUR",
      "notes": "string",
      "thesis": "string",
      "confidence": 0,
      "reason": "string"
    }
  ]
}
`.trim();
}

function createPricePrompt(assets) {
  return `
你是一個投資資產查價助手。請使用 Google Search 尋找以下每項資產「最新可見市場價格」。

要求：
1. 每項資產只回傳一個 JSON 物件。
2. latest_price 盡量用 target_currency 回傳；如果做不到，可以用最接近的交易貨幣。
3. quote_symbol 優先使用最適合公開市場查詢的代號，例如 NVDA、0700.HK、bitcoin。
4. 如果找不到可靠價格，latest_price 請回傳 null，並填寫 reason。
5. 只回傳 JSON array，不要加解釋。

資產：
${JSON.stringify(
    assets.map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      quote_symbol: asset.quote_symbol || "",
      name: asset.name,
      asset_type: asset.asset_type,
      target_currency: asset.currency,
    })),
    null,
    2,
  )}

JSON 格式：
[
  {
    "id": "string",
    "quote_symbol": "string",
    "latest_price": 0,
    "price_currency": "string",
    "reason": "string",
    "confidence": 0
  }
]
`.trim();
}

function createDailyBriefPrompt(portfolio) {
  return `
你是一個投資研究助理。請根據目前資產庫，並使用 Google Search 補充最新市場脈絡，輸出今日資產簡報。

目前資產庫：
${summarizePortfolio(portfolio)}

只回傳 JSON object，不要加 markdown。

JSON 格式：
{
  "headline": "string",
  "summary": "string",
  "opportunities": ["string"],
  "risks": ["string"],
  "follow_ups": ["string"]
}
`.trim();
}

module.exports = {
  callGeminiJson,
  createAssistantPrompt,
  createDailyBriefPrompt,
  createPricePrompt,
  getGeminiModels,
  isGeminiConfigured,
  readJsonBody,
  sendJson,
};
