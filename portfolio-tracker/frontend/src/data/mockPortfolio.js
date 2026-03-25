export const dashboardSummary = {
  intro:
    "這一版先聚焦在路由、頁面資訊架構與手機優先體驗。所有數字、分析與匯入結果都是假資料，方便我們先把產品骨架站穩。",
  metrics: [
    {
      label: "總資產估值",
      value: "US$ 286,420",
      delta: "+3.8% 本週",
      detail: "跨港股、美股、ETF 和加密貨幣",
      tone: "neutral",
    },
    {
      label: "未實現盈虧",
      value: "+US$ 41,880",
      delta: "+17.1%",
      detail: "NVDA 與 BTC 貢獻最多",
      tone: "positive",
    },
    {
      label: "現金比重",
      value: "12.4%",
      delta: "保留彈性",
      detail: "適合後續加倉或應急配置",
      tone: "neutral",
    },
  ],
  allocation: [
    { label: "美股", value: 44, amount: "US$ 126,000", color: "var(--tone-coral)" },
    { label: "港股", value: 27, amount: "US$ 77,600", color: "var(--tone-gold)" },
    { label: "ETF", value: 18, amount: "US$ 51,500", color: "var(--tone-teal)" },
    { label: "加密貨幣", value: 11, amount: "US$ 31,320", color: "var(--tone-sky)" },
  ],
  accounts: [
    { name: "長線投資帳戶", provider: "manual", currency: "USD", value: "US$ 141,600", change: "+4.1%", holdings: 6 },
    { name: "港股收息帳戶", provider: "manual", currency: "HKD", value: "HK$ 408,000", change: "+1.8%", holdings: 5 },
    { name: "加密冷錢包", provider: "manual", currency: "USD", value: "US$ 31,320", change: "+6.4%", holdings: 2 },
  ],
  activity: [
    { title: "手動更新價格", detail: "BTC 由 US$ 84,900 調整至 US$ 86,200", time: "今天 09:20" },
    { title: "新增資產草稿", detail: "從券商截圖提取 4 筆待確認持倉", time: "昨天 22:15" },
    { title: "AI 分析摘要", detail: "大型科技股權重偏高，需留意單一題材集中", time: "昨天 20:40" },
  ],
};

export const positions = [
  {
    id: "pos-nvda",
    name: "NVIDIA",
    symbol: "NVDA",
    account: "長線投資帳戶",
    type: "股票",
    currency: "USD",
    quantity: "18 股",
    avgCost: "US$ 712.50",
    lastPrice: "US$ 918.20",
    value: "US$ 16,528",
    pnl: "+28.9%",
    note: "AI 龍頭，波動高但成長強。",
  },
  {
    id: "pos-vwra",
    name: "Vanguard FTSE All-World",
    symbol: "VWRA",
    account: "長線投資帳戶",
    type: "ETF",
    currency: "USD",
    quantity: "92 股",
    avgCost: "US$ 112.00",
    lastPrice: "US$ 129.80",
    value: "US$ 11,942",
    pnl: "+15.9%",
    note: "全球分散核心部位。",
  },
  {
    id: "pos-700hk",
    name: "騰訊控股",
    symbol: "0700.HK",
    account: "港股收息帳戶",
    type: "股票",
    currency: "HKD",
    quantity: "300 股",
    avgCost: "HK$ 305.00",
    lastPrice: "HK$ 389.60",
    value: "HK$ 116,880",
    pnl: "+27.7%",
    note: "平台型資產，兼顧增長與現金流。",
  },
  {
    id: "pos-2800hk",
    name: "盈富基金",
    symbol: "2800.HK",
    account: "港股收息帳戶",
    type: "ETF",
    currency: "HKD",
    quantity: "1,400 股",
    avgCost: "HK$ 18.75",
    lastPrice: "HK$ 20.84",
    value: "HK$ 29,176",
    pnl: "+11.1%",
    note: "用作港股 Beta 配置。",
  },
  {
    id: "pos-btc",
    name: "Bitcoin",
    symbol: "BTC",
    account: "加密冷錢包",
    type: "加密貨幣",
    currency: "USD",
    quantity: "0.36 BTC",
    avgCost: "US$ 61,500",
    lastPrice: "US$ 86,200",
    value: "US$ 31,032",
    pnl: "+40.2%",
    note: "高波動核心題材，暫時不啟用自動調倉建議。",
  },
  {
    id: "pos-cash",
    name: "可動用現金",
    symbol: "CASH",
    account: "長線投資帳戶",
    type: "現金",
    currency: "USD",
    quantity: "US$ 35,600",
    avgCost: "1:1",
    lastPrice: "US$ 35,600",
    value: "US$ 35,600",
    pnl: "0.0%",
    note: "保留給月供和加倉機會。",
  },
];

export const importDraft = {
  imageName: "ib-account-snapshot-mar-2026.png",
  uploadedAt: "今天 10:12",
  parsingStatus: "待人工確認",
  completion: "4 / 5 已成功辨識",
  highlights: [
    "辨識到 2 筆美股、1 筆 ETF、1 筆現金部位",
    "有 1 筆代號模糊，需要你手動確認",
    "匯入前會先停在草稿，不會直接寫入正式持倉",
  ],
  items: [
    { name: "Apple", symbol: "AAPL", type: "股票", quantity: "22", avgCost: "US$ 182.40", confidence: "98%" },
    { name: "Microsoft", symbol: "MSFT", type: "股票", quantity: "10", avgCost: "US$ 403.15", confidence: "96%" },
    { name: "SPDR S&P 500 ETF", symbol: "SPY", type: "ETF", quantity: "15", avgCost: "US$ 517.30", confidence: "95%" },
    { name: "美元現金", symbol: "USD Cash", type: "現金", quantity: "5,640", avgCost: "1:1", confidence: "99%" },
    { name: "待確認資產", symbol: "??", type: "未知", quantity: "-", avgCost: "-", confidence: "48%" },
  ],
};

export const analysisMock = {
  headline:
    "如果這個組合照現時分布繼續持有，最大的機會來自 AI 相關成長資產，但最大的風險同樣是科技股集中度。",
  score: "74 / 100",
  lastGeneratedAt: "昨天 20:40",
  cards: [
    {
      title: "集中風險",
      body: "前 3 大持倉佔比偏高，當市場風格切換時，組合回撤可能會快過大市。",
      tone: "warning",
    },
    {
      title: "現金緩衝",
      body: "現金比重超過一成，對分段加倉和短期波動有緩衝效果。",
      tone: "positive",
    },
    {
      title: "地區分散",
      body: "目前仍以美股和港股為主，若後續要再穩一點，可考慮提高全球 ETF 比重。",
      tone: "neutral",
    },
  ],
  prompts: [
    "如果未來三個月科技股回調 15%，組合會怎樣？",
    "現金應否分批轉入 ETF，而不是單押個股？",
    "用保守角度重整成收息 + 成長雙核心會怎樣？",
  ],
};

export const settingsMock = {
  identity: {
    label: "身份模式",
    value: "匿名使用者",
    detail: "目前只有本地假資料，不需要登入，也不會同步真實資料。",
  },
  storage: {
    label: "資料來源",
    value: "Mock Portfolio",
    detail: "下一步才會切到 Firebase Authentication + Firestore。",
  },
  safety: [
    "匯入圖片時先停在草稿，不直接寫入正式持倉",
    "AI 分析只提供觀察與風險提示，不自動執行交易",
    "價格更新會保留最後來源與時間，方便日後稽核",
  ],
  nextSteps: [
    "接匿名登入與 Firestore rules",
    "把假資料替換成 positions / accounts collection",
    "接 Vercel Functions 與 Gemini 三個模組",
  ],
};
