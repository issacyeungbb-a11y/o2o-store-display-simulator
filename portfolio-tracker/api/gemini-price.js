const { callGeminiJson, createPricePrompt, getGeminiModels, isGeminiConfigured, readJsonBody, sendJson } = require("./_gemini");

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
    const assets = Array.isArray(body.assets) ? body.assets : [];
    const { data } = await callGeminiJson({
      model: getGeminiModels().price,
      prompt: createPricePrompt(assets),
      useGoogleSearch: true,
      temperature: 0.1,
      maxOutputTokens: 4096,
    });

    sendJson(res, 200, Array.isArray(data) ? data : []);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Gemini 查價失敗",
    });
  }
};
