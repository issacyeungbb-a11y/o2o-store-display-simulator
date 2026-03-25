const DEFAULT_MODELS = {
  price: "gemini-2.5-flash-lite",
  analysis: "gemini-2.5-flash",
  brief: "gemini-2.5-flash",
};

const GEMINI_CONFIG_ENDPOINT = import.meta.env.VITE_GEMINI_CONFIG_ENDPOINT || "/api/gemini-config";
const GEMINI_PRICE_ENDPOINT = import.meta.env.VITE_GEMINI_PRICE_ENDPOINT || "/api/gemini-price";
const GEMINI_ASSISTANT_ENDPOINT = import.meta.env.VITE_GEMINI_ASSISTANT_ENDPOINT || "/api/gemini-assistant";
const GEMINI_BRIEF_ENDPOINT = import.meta.env.VITE_GEMINI_BRIEF_ENDPOINT || "/api/gemini-daily-brief";

let configPromise = null;

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Gemini request failed with status ${response.status}`);
  }

  return data;
}

async function fileToInlineData(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return {
    mime_type: file.type || "image/png",
    data: btoa(binary),
  };
}

export const geminiModels = DEFAULT_MODELS;

export async function getGeminiServerConfig() {
  if (!configPromise) {
    configPromise = fetch(GEMINI_CONFIG_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || `Gemini config request failed with status ${response.status}`);
        }

        return {
          enabled: Boolean(data?.enabled),
          mode: data?.mode || "serverless",
          models: {
            ...DEFAULT_MODELS,
            ...(data?.models || {}),
          },
        };
      })
      .catch(() => ({
        enabled: false,
        mode: "fallback",
        models: DEFAULT_MODELS,
      }));
  }

  return configPromise;
}

export async function quoteAssetsWithGemini(assets) {
  const data = await postJson(GEMINI_PRICE_ENDPOINT, { assets });
  return Array.isArray(data) ? data : [];
}

export async function askGeminiAssistant({ message, history, imageFile, portfolio }) {
  const image = imageFile ? await fileToInlineData(imageFile) : null;

  return postJson(GEMINI_ASSISTANT_ENDPOINT, {
    message,
    history,
    portfolio,
    image,
  });
}

export async function generateGeminiDailyBrief(portfolio) {
  return postJson(GEMINI_BRIEF_ENDPOINT, {
    portfolio,
  });
}
