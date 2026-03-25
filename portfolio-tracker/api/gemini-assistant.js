const { callGeminiJson, createAssistantPrompt, getGeminiModels, isGeminiConfigured, readJsonBody, sendJson } = require("./_gemini");

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
    const { message = "", history = [], portfolio = {}, image = null } = body;
    const { data } = await callGeminiJson({
      model: getGeminiModels().analysis,
      prompt: createAssistantPrompt({ message, history, portfolio }),
      image,
      useGoogleSearch: false,
      temperature: 0.35,
      maxOutputTokens: 4096,
    });

    sendJson(res, 200, {
      reply: data?.reply || "Gemini 暫時未能整理回覆。",
      insights: Array.isArray(data?.insights) ? data.insights : [],
      suggested_assets: Array.isArray(data?.suggested_assets) ? data.suggested_assets : [],
      mode: "gemini-serverless",
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Gemini 助理失敗",
    });
  }
};
