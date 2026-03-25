import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { aiEndpoint, collectionName, db, firebaseReady } from "../lib/firebase";
import { askGeminiAssistant, geminiModels, generateGeminiDailyBrief, getGeminiServerConfig } from "../lib/gemini";
import {
  DEFAULT_MARKET_DATA_CONFIG,
  refreshAssetsMarketPrices as requestMarketPriceRefresh,
  suggestQuoteSymbol,
  supportsAutoPricing,
} from "../lib/marketData";
import { buildPortfolio, DEMO_ASSETS, fallbackInsights } from "../lib/portfolio";

const LOCAL_STORAGE_KEY = "portfolio-tracker-local-assets";

function getAssetIdentity(asset) {
  if (asset?.client_id) {
    return `client:${asset.client_id}`;
  }

  return [
    asset?.source || "",
    asset?.account_name || "",
    asset?.symbol || "",
    asset?.name || "",
    asset?.asset_type || "",
    asset?.currency || "",
  ].join("::");
}

function loadLocalAssets() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_ASSETS));
      return DEMO_ASSETS;
    }
    return JSON.parse(raw);
  } catch {
    return DEMO_ASSETS;
  }
}

function saveLocalAssets(items) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

function shouldMigrateLocalAsset(asset) {
  return Boolean(asset) && !String(asset.id || "").startsWith("demo-");
}

function persistLocalState(setAssets, items) {
  setAssets(items);
  saveLocalAssets(items);
}

function normalizeAssetPayload(payload) {
  return {
    ...payload,
    client_id: payload.client_id || crypto.randomUUID(),
    quote_symbol: String(payload.quote_symbol || suggestQuoteSymbol(payload) || "").trim(),
    quantity: Number(payload.quantity || 0),
    unit_cost: Number(payload.unit_cost || 0),
    price: Number(payload.price || 0),
    price_source: payload.price_source || "",
    price_updated_at: payload.price_updated_at || "",
    price_status: payload.price_status || "",
    quote_error: payload.quote_error || "",
    updated_at: new Date().toISOString(),
  };
}

function mergeUpdatedAssets(currentAssets, updates) {
  const updatesById = new Map(updates.map((item) => [item.id, item]));
  return currentAssets.map((asset) => (updatesById.has(asset.id) ? { ...asset, ...updatesById.get(asset.id) } : asset));
}

function parseStructuredLines(message) {
  const suggestions = [];
  for (const rawLine of message.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.split(",").length < 9) {
      continue;
    }
    const [source, account_name, symbol, name, asset_type, quantity, unit_cost, price, currency, ...rest] = line
      .split(",")
      .map((part) => part.trim());
    const notes = rest.join(", ");
    const parsedQuantity = Number(quantity);
    const parsedCost = Number(unit_cost);
    const parsedPrice = Number(price);
    if (Number.isNaN(parsedQuantity) || Number.isNaN(parsedCost) || Number.isNaN(parsedPrice)) {
      continue;
    }
    suggestions.push({
      source: ["futu", "ib", "crypto", "other"].includes(source) ? source : "other",
      account_name: account_name || "未命名位置",
      symbol: symbol || "UNKNOWN",
      name: name || symbol || "未命名資產",
      asset_type: asset_type || "other",
      quantity: parsedQuantity,
      unit_cost: parsedCost,
      price: parsedPrice,
      currency: currency || "HKD",
      notes,
      thesis: "",
      confidence: 0.74,
      reason: "根據你貼上的結構化文字整理。",
    });
  }
  return suggestions;
}

async function callAiEndpoint({ message, history, imageFile, portfolio, geminiEnabled }) {
  if (geminiEnabled) {
    return askGeminiAssistant({ message, history, imageFile, portfolio });
  }

  if (!aiEndpoint) {
    const suggestions = parseStructuredLines(message);
    return {
      reply:
        "而家未設定 Gemini，所以先用本地模式回覆。你可以直接貼結構化持倉文字，我會先幫你整理成可匯入資產。",
      insights: fallbackInsights(portfolio),
      suggested_assets: suggestions,
      mode: "fallback",
      generated_at: new Date().toISOString(),
    };
  }

  const formData = new FormData();
  formData.append("message", message);
  formData.append("history", JSON.stringify(history));
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const response = await fetch(aiEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  return response.json();
}

export function usePortfolio() {
  const [assets, setAssets] = useState([]);
  const [geminiConfig, setGeminiConfig] = useState({
    enabled: false,
    mode: "fallback",
    models: geminiModels,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dailyBrief, setDailyBrief] = useState(null);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const hasRunInitialAutoRefresh = useRef(false);
  const autoRefreshInFlight = useRef(false);
  const hasAttemptedLocalMigration = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getGeminiServerConfig().then((config) => {
      if (!cancelled) {
        setGeminiConfig(config);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db) {
      const localAssets = loadLocalAssets();
      setAssets(localAssets);
      setLoading(false);
      setSyncStatus({
        tone: "ok",
        message: "資產已保存在本機，重新打開系統仍會見到。",
      });
      return undefined;
    }

    const assetsCollection = collection(db, collectionName);
    const cachedAssets = loadLocalAssets().filter(shouldMigrateLocalAsset);
    if (cachedAssets.length) {
      setAssets(cachedAssets);
      setLoading(false);
      setSyncStatus({
        tone: "warn",
        message: "已先載入本機備份，正在同步雲端資料。",
      });
    }

    const unsubscribe = onSnapshot(
      assetsCollection,
      async (snapshot) => {
        let nextAssets = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        if (!hasAttemptedLocalMigration.current) {
          hasAttemptedLocalMigration.current = true;
          const localAssets = loadLocalAssets().filter(shouldMigrateLocalAsset);
          const remoteIds = new Set(nextAssets.map(getAssetIdentity));
          const missingLocalAssets = localAssets.filter((asset) => !remoteIds.has(getAssetIdentity(asset)));

          if (missingLocalAssets.length) {
            await Promise.all(
              missingLocalAssets.map(({ id, ...asset }) =>
                addDoc(assetsCollection, {
                  ...normalizeAssetPayload(asset),
                  server_updated_at: serverTimestamp(),
                }),
              ),
            );

            const reloaded = await getDocs(assetsCollection);
            nextAssets = reloaded.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

            setQuoteStatus({
              tone: "ok",
              message: `已將本機舊資產同步回 Firebase，共恢復 ${missingLocalAssets.length} 項資產。`,
            });
          }
        }

        nextAssets.sort((left, right) => {
          const leftTime = new Date(left.updated_at || 0).getTime();
          const rightTime = new Date(right.updated_at || 0).getTime();
          return rightTime - leftTime;
        });

        setAssets(nextAssets);
        saveLocalAssets(nextAssets);
        setLoading(false);
        setRefreshing(false);
        setError("");
        setSyncStatus({
          tone: "ok",
          message: "資產已同步到 Firebase 與本機備份。",
        });
      },
      (snapshotError) => {
        setError(snapshotError.message);
        const fallbackAssets = loadLocalAssets();
        setAssets(fallbackAssets);
        setLoading(false);
        setRefreshing(false);
        setSyncStatus({
          tone: "warn",
          message: "雲端同步暫時失敗，已改用本機備份資產。",
        });
      },
    );

    return unsubscribe;
  }, []);

  const portfolio = useMemo(() => buildPortfolio(assets), [assets]);
  const marketDataConfig = useMemo(
    () => ({
      ...DEFAULT_MARKET_DATA_CONFIG,
      stockQuotesEnabled: geminiConfig.enabled,
      cryptoQuotesEnabled: geminiConfig.enabled,
      model: geminiConfig.models.price,
    }),
    [geminiConfig],
  );

  const assistantConfig = useMemo(
    () => ({
      ai_enabled: geminiConfig.enabled || Boolean(aiEndpoint),
      model: geminiConfig.enabled
        ? `${geminiConfig.models.analysis} / ${geminiConfig.models.brief}`
        : aiEndpoint
          ? "Custom AI Endpoint"
          : "Fallback",
      supported_inputs: ["自然語言描述", "持倉截圖", "手動輸入的交易或成本資料"],
      required_data: ["Firebase 專案設定", "資產資料或截圖", "你想分析的問題", "Vercel Serverless Gemini 設定"],
      recommendation: geminiConfig.enabled
        ? "Gemini serverless 已接上。查價會使用 Gemini Google Search，分析與每日簡報會使用 Gemini 模型。"
        : firebaseReady
          ? "Firebase 已接上。若要 AI 讀圖與分析，請在 Vercel serverless 設定 Gemini API key。"
        : "請先填入 Firebase config。未填前會以本地 demo 模式運作。",
    }),
    [aiEndpoint, firebaseReady, geminiConfig],
  );

  const refresh = async () => {
    setRefreshing(true);
    if (!firebaseReady || !db) {
      setAssets(loadLocalAssets());
      setRefreshing(false);
      return;
    }
    setRefreshing(false);
  };

  const refreshMarketPrices = async (assetIds = null, options = {}) => {
    const { silent = false } = options;
    const targetAssets = (assetIds ? assets.filter((asset) => assetIds.includes(asset.id)) : assets).filter((asset) =>
      supportsAutoPricing(asset, geminiConfig.enabled),
    );

    if (!targetAssets.length) {
      if (!silent) {
        setQuoteStatus({
            tone: "warn",
            message: "目前未有可自動更新市價的資產，或者 Gemini serverless 尚未啟用。",
          });
      }
      return { updates: [], warnings: [] };
    }

    setQuoteRefreshing(true);
    try {
      const result = await requestMarketPriceRefresh(targetAssets, { enabled: geminiConfig.enabled });

      if (result.updates.length) {
        if (!firebaseReady || !db) {
          const nextAssets = mergeUpdatedAssets(assets, result.updates);
          setAssets(nextAssets);
          saveLocalAssets(nextAssets);
          setSyncStatus({
            tone: "ok",
            message: "最新價格已更新到本機資產。",
          });
        } else {
          await Promise.all(
            result.updates.map(({ id, ...fields }) =>
              updateDoc(doc(db, collectionName, id), {
                ...fields,
                server_updated_at: serverTimestamp(),
              }),
            ),
          );
        }
      }

      if (!silent) {
        if (result.warnings.length && !result.updates.length) {
          setQuoteStatus({
            tone: "error",
            message: result.warnings[0].message,
          });
        } else if (result.warnings.length) {
          setQuoteStatus({
            tone: "warn",
            message: `已更新 ${result.updates.length} 項資產市價，另有 ${result.warnings.length} 項未能自動拉價。`,
          });
        } else {
          setQuoteStatus({
            tone: "ok",
            message: `已更新 ${result.updates.length} 項資產的最新市場價。`,
          });
        }
      }

      return result;
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "更新市場價失敗";
      if (!silent) {
        setQuoteStatus({
          tone: "error",
          message,
        });
      }
      throw refreshError;
    } finally {
      setQuoteRefreshing(false);
    }
  };

  useEffect(() => {
    if (loading || !assets.length) {
      return undefined;
    }

    const hasPricedAssets = assets.some((asset) => supportsAutoPricing(asset, geminiConfig.enabled));
    if (!hasPricedAssets) {
      return undefined;
    }

    if (!hasRunInitialAutoRefresh.current) {
      hasRunInitialAutoRefresh.current = true;
      autoRefreshInFlight.current = true;
      refreshMarketPrices(null, { silent: true })
        .catch(() => undefined)
        .finally(() => {
          autoRefreshInFlight.current = false;
        });
    }

    const intervalId = window.setInterval(() => {
      if (autoRefreshInFlight.current) {
        return;
      }

      autoRefreshInFlight.current = true;
      refreshMarketPrices(null, { silent: true })
        .catch(() => undefined)
        .finally(() => {
          autoRefreshInFlight.current = false;
        });
    }, marketDataConfig.autoRefreshMinutes * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [assets, geminiConfig.enabled, loading, marketDataConfig.autoRefreshMinutes]);

  const addAsset = async (payload) => {
    setSaving(true);
    try {
      let record = normalizeAssetPayload(payload);
      const optimisticAsset = { ...record, id: `local-${record.client_id}` };

      if (supportsAutoPricing(record, geminiConfig.enabled)) {
        try {
          const stagedAsset = { id: "__draft__", ...record };
          const quoteResult = await requestMarketPriceRefresh([stagedAsset], { enabled: geminiConfig.enabled });
          if (quoteResult.updates[0]) {
            record = {
              ...record,
              ...quoteResult.updates[0],
            };
            delete record.id;
            setQuoteStatus({
              tone: "ok",
              message: `已根據市場最新價格加入 ${record.symbol || record.name}。`,
            });
          } else if (quoteResult.warnings[0]) {
            setQuoteStatus({
              tone: "warn",
              message: quoteResult.warnings[0].message,
            });
          }
        } catch {
          setQuoteStatus({
            tone: "warn",
            message: `未能即時拉取 ${record.symbol || record.name} 的市場價，資產已先按手動資料儲存。`,
          });
        }
      }

      const nextLocalAssets = [optimisticAsset, ...assets.filter((asset) => asset.id !== optimisticAsset.id)];
      persistLocalState(setAssets, nextLocalAssets);
      setSyncStatus({
        tone: "ok",
        message: "資產已先保存到本機，正在同步雲端。",
      });

      if (!firebaseReady || !db) {
        setSyncStatus({
          tone: "ok",
          message: "資產已成功保存到本機。",
        });
        return;
      }

      try {
        await addDoc(collection(db, collectionName), {
          ...record,
          server_updated_at: serverTimestamp(),
        });
        setSyncStatus({
          tone: "ok",
          message: "資產已保存，並會同步到之後每次打開的系統。",
        });
      } catch {
        setSyncStatus({
          tone: "warn",
          message: "資產已保存在本機；雲端暫時未同步成功，之後重新打開系統會再補同步。",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateAsset = async (assetId, payload) => {
    setSaving(true);
    try {
      const record = normalizeAssetPayload(payload);
      const nextAssets = assets.map((asset) => (asset.id === assetId ? { ...asset, ...record } : asset));
      persistLocalState(setAssets, nextAssets);
      setSyncStatus({
        tone: "ok",
        message: "修改已先保存到本機，正在同步雲端。",
      });

      if (!firebaseReady || !db) {
        setSyncStatus({
          tone: "ok",
          message: "資產修改已保存到本機。",
        });
        return;
      }

      if (String(assetId).startsWith("local-")) {
        setSyncStatus({
          tone: "warn",
          message: "資產暫存於本機，重新打開系統時會自動補同步到 Firebase。",
        });
        return;
      }

      try {
        await updateDoc(doc(db, collectionName, assetId), {
          ...record,
          server_updated_at: serverTimestamp(),
        });
        setSyncStatus({
          tone: "ok",
          message: "資產修改已同步保存。",
        });
      } catch {
        setSyncStatus({
          tone: "warn",
          message: "資產修改已先保存在本機；雲端會稍後再補同步。",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const importSuggestedAssets = async (items) => {
    for (const item of items) {
      await addAsset(item);
    }
  };

  const removeAsset = async (assetId) => {
    setSaving(true);
    try {
      const nextAssets = assets.filter((asset) => asset.id !== assetId);
      persistLocalState(setAssets, nextAssets);

      if (!firebaseReady || !db) {
        setSyncStatus({
          tone: "ok",
          message: "資產已從本機清單刪除。",
        });
        return;
      }

      if (String(assetId).startsWith("local-")) {
        setSyncStatus({
          tone: "ok",
          message: "本機暫存資產已刪除。",
        });
        return;
      }

      try {
        await deleteDoc(doc(db, collectionName, assetId));
        setSyncStatus({
          tone: "ok",
          message: "資產已同步刪除。",
        });
      } catch {
        setSyncStatus({
          tone: "warn",
          message: "資產已先從本機清單移除；雲端刪除會稍後再處理。",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const askAssistant = async ({ message, history, imageFile }) => {
    setAssistantLoading(true);
    try {
      return await callAiEndpoint({ message, history, imageFile, portfolio, geminiEnabled: geminiConfig.enabled });
    } finally {
      setAssistantLoading(false);
    }
  };

  const generateDailyBrief = async () => {
    setBriefLoading(true);
    try {
      if (geminiConfig.enabled) {
        const generated = await generateGeminiDailyBrief(portfolio);
        setDailyBrief(generated);
        return generated;
      }

      const fallback = {
        headline: "今日資產簡報已準備好",
        summary: portfolio.sources.length
          ? portfolio.sources.map((source) => `${source.label}: HKD ${source.total_market_value_hkd.toFixed(0)}`).join("；")
          : "目前資產庫仍然是空的，先新增資產再生成每日簡報。",
        opportunities: [
          "檢查最大持倉的基本面與短期催化劑，有沒有值得加減倉的事件。",
          "比較現金比例與風險資產比例，決定今天是否需要保留更多彈性。",
        ],
        risks: [
          "留意來源是否過度集中在單一券商或單一市場。",
          "如果加密貨幣佔比偏高，今日波動可能會放大整體組合變化。",
        ],
        follow_ups: [
          "把最新成交、轉倉或現金變動更新到資產庫。",
          "告訴 AI 今天最想研究的 1 至 2 個標的，系統就可以聚焦分析。",
        ],
        mode: aiEndpoint ? "cloud" : "fallback",
        generated_at: new Date().toISOString(),
      };
      setDailyBrief(fallback);
      return fallback;
    } finally {
      setBriefLoading(false);
    }
  };

  return {
    portfolio,
    assistantConfig,
    dailyBrief,
    loading,
    refreshing,
    saving,
    assistantLoading,
    briefLoading,
    error,
    refresh,
    addAsset,
    updateAsset,
    importSuggestedAssets,
    removeAsset,
    refreshMarketPrices,
    askAssistant,
    generateDailyBrief,
    firebaseReady,
    marketDataConfig,
    quoteRefreshing,
    quoteStatus,
    syncStatus,
  };
}
