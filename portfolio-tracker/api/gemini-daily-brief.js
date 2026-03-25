const { callGeminiJson, createDailyBriefPrompt, getGeminiModels, isGeminiConfigured, readJsonBody, sendJson } = require("./_gemini");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isGeminiConfigured()) {
    sendJson(res, 503, { error: "伺服器尚未設定 Gemini API key。" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const portfolio = body?.portfolio || {};
    const { data } = await callGeminiJson({
      model: getGeminiModels().brief,
      prompt: createDailyBriefPrompt(portfolio),
      useGoogleSearch: true,
      temperature: 0.3,
      maxOutputTokens: 4096,
    });

    sendJson(res, 200, {
      headline: data?.headline || "今日資產簡報",
      summary: data?.summary || "Gemini 暫時未能生成完整摘要。",
      opportunities: Array.isArray(data?.opportunities) ? data.opportunities : [],
      risks: Array.isArray(data?.risks) ? data.risks : [],
      follow_ups: Array.isArray(data?.follow_ups) ? data.follow_ups : [],
      mode: "gemini-serverless",
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Gemini 每日簡報失敗",
    });
  }
};
