from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "portfolio.json"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2").strip() or "gpt-5.2"

USD_PER_CURRENCY = {
    "USD": 1.0,
    "USDT": 1.0,
    "HKD": 0.128,
    "JPY": 0.0067,
    "CNH": 0.138,
    "CNY": 0.138,
    "SGD": 0.74,
    "AUD": 0.66,
    "CAD": 0.74,
    "EUR": 1.09,
}

SOURCE_LABELS = {
    "futu": "富途",
    "ib": "盈透證券",
    "crypto": "加密貨幣",
    "other": "其他",
}

SUPPORTED_INPUTS = [
    "自然語言描述",
    "持倉截圖",
    "手動輸入的交易或成本資料",
]

REQUIRED_AI_DATA = [
    "OpenAI API Key",
    "你目前資產資料或截圖",
    "想分析的問題，例如倉位過重、風險、現金比例、每日機會",
]
