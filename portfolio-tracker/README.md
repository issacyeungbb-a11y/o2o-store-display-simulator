# 資產總覽 AI 工作台

這個版本已改為 **React + Firebase** 架構，並採用 **免登入直接打開** 的使用方式。

你打開頁面之後，系統會：

- 直接顯示資產內容
- 以 `富途 / IB / 加密貨幣 / 其他` 分來源展示
- 讓你手動輸入與刪除資產
- 以 Firebase Firestore 作為雲端資料來源
- 以 Vercel serverless + Gemini API 處理截圖與對話分析
- 以 serverless Gemini Google Search 為股票 / ETF / 加密貨幣拉取最新市場價

如果尚未填入 Firebase 專案設定，系統會先以本地 demo 模式運作，方便先預覽介面與流程。

## 架構

```text
瀏覽器
  ↓
React + Vite Frontend
  ↓
Firebase Firestore
  ↓
Vercel Serverless API
  ↓
Gemini API / Google Search
```

## 目前版本重點

- 不再需要本地 backend 才能使用主流程
- 不再需要登入才看得到內容
- 直接打開頁面即可操作
- Firebase 未設定時，會自動落回本地 demo 資產庫

## 啟動方式

```bash
cd /Users/yinwaiyeung/Documents/Playground/portfolio-tracker
./run-dev.sh
```

啟動後：

- [http://localhost:4173](http://localhost:4173)

如果你只想雙擊打開，可用：

- [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/資產總覽 AI 工作台.app](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/資產總覽%20AI%20工作台.app)
- [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/開啟資產總覽 AI 工作台.command](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/開啟資產總覽%20AI%20工作台.command)

## Firebase 設定

請把以下檔案複製成 `.env.local`：

[/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/.env.example](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/.env.example)

然後填入你的 Firebase 專案資料：

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_COLLECTION=portfolio_assets_public
VITE_MARKET_AUTO_REFRESH_MINUTES=5
VITE_GEMINI_CONFIG_ENDPOINT=/api/gemini-config
VITE_GEMINI_PRICE_ENDPOINT=/api/gemini-price
VITE_GEMINI_ASSISTANT_ENDPOINT=/api/gemini-assistant
VITE_GEMINI_BRIEF_ENDPOINT=/api/gemini-daily-brief
```

### 你最少要提供的 Firebase 資料

- Firebase Web App config
- Firestore 已啟用
- 一個共用 collection 名稱

### 因為你要求「免登入直開」

這代表：

- 前端會直接讀寫 Firestore
- 你需要自行設定 Firestore rules
- 如果資料要完全公開可讀寫，規則會偏寬鬆

所以這個方案適合：

- 個人 demo
- 小範圍私人使用
- 先快速建立雲端版原型

如果之後你想再安全一點，可以下一輪再加：

- 匿名登入
- App Check
- 密碼頁
- Cloud Functions 中轉寫入

## Gemini 功能

目前系統可透過 serverless Gemini 做：

- AI 對話與截圖整理
- 最新市場價查詢
- 每日簡報與資產分析

建議模型：

- 查價：`gemini-2.5-flash-lite`
- 一般分析：`gemini-2.5-flash`
- 每日簡報：`gemini-2.5-flash`

## 即時市場價

系統而家用 `Gemini Google Search` 來查最新市場價。

### 你需要準備的設定

前端不再直接保存 Gemini key。部署時請在 Vercel 專案設定這些 serverless 環境變數：

```bash
GEMINI_API_KEY=你的_gemini_api_key
GEMINI_PRICE_MODEL=gemini-2.5-flash-lite
GEMINI_ANALYSIS_MODEL=gemini-2.5-flash
GEMINI_BRIEF_MODEL=gemini-2.5-flash
```

### 使用方式

- 新增資產時，可填 `行情代號（可選）`
- 如果不填，系統會先嘗試從資產代號自動推算
- 加入資產後，系統會嘗試即時拉取最新市場價
- 頁面右上有 `更新市場價`，可一次更新全部資產
- 已存在的資產在開頁後會先自動同步一次，之後每隔幾分鐘自動刷新

### 行情代號建議格式

- 港股：`700.HK`
- 美股：`NVDA`
- 加密貨幣：`bitcoin`

如果資產未能自動拉價，通常只要補上正確的 `行情代號` 就可以。
富途格式如 `HK.00700` 亦可直接輸入，系統會自動優先轉成較穩定的 `0700.HK` 再查價。

## 結構化文字輸入格式

即使未接上 Gemini，你都可以直接貼：

```text
futu, 富途 保證金綜合, HK.00700, 騰訊控股, stock, 200, 318, 368, HKD
ib, IB 主賬戶, NVDA, NVIDIA, stock, 35, 102, 118, USD
crypto, Ledger 冷錢包, BTC, Bitcoin, crypto, 0.35, 58200, 69800, USD
```

系統會把它整理成可匯入資產。

## 核心檔案

- 前端主畫面：
  [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/App.jsx](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/App.jsx)
- Firebase 設定：
  [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/firebase.js](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/firebase.js)
- 資產計算邏輯：
  [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/portfolio.js](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/portfolio.js)
- Firebase / fallback 資料流程：
  [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/hooks/usePortfolio.js](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/hooks/usePortfolio.js)
- 市場報價邏輯：
  [/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/marketData.js](/Users/yinwaiyeung/Documents/Playground/portfolio-tracker/frontend/src/lib/marketData.js)

## 驗證

目前已驗證：

- 前端可以 build
- 免登入模式可直接打開
- 未設定 Firebase 時，會載入 demo 資產
- 未設定 Gemini 時，fallback 模式仍可回應
