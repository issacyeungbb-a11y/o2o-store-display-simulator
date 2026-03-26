const { getGeminiModels, isGeminiConfigured, sendJson } = require("./_gemini");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  sendJson(res, 200, {
    enabled: isGeminiConfigured(),
    mode: "serverless",
    models: getGeminiModels(),
  });
};
