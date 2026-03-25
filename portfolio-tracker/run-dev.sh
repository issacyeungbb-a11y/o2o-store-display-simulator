#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LAN_IP=""

port_in_use() {
  lsof -ti "tcp:$1" >/dev/null 2>&1
}

detect_lan_ip() {
  local candidate=""
  candidate="$(ipconfig getifaddr en0 2>/dev/null || true)"
  if [[ -z "$candidate" ]]; then
    candidate="$(ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  printf "%s" "$candidate"
}

if ! command -v npm >/dev/null 2>&1; then
  echo "找不到 npm。"
  echo "請先安裝 Node.js，之後再執行：./run-dev.sh"
  exit 1
fi

echo "檢查 frontend 依賴..."
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "安裝 frontend 依賴..."
  (
    cd "$FRONTEND_DIR"
    npm install
  )
fi

LAN_IP="$(detect_lan_ip)"

if port_in_use 4173; then
  echo "偵測到 frontend 已經在 http://localhost:4173 運行，直接打開系統。"
  if [[ -n "$LAN_IP" ]]; then
    echo "手機可於同一 Wi-Fi 下打開：http://$LAN_IP:4173"
  fi
  open http://localhost:4173
  exit 0
fi

echo "建立 frontend production build..."
(
  cd "$FRONTEND_DIR"
  npm run build
)

echo "啟動 frontend：http://localhost:4173"
if [[ -n "$LAN_IP" ]]; then
  echo "手機可於同一 Wi-Fi 下打開：http://$LAN_IP:4173"
fi
echo "稍後會自動打開瀏覽器。按 Ctrl+C 會停止前端服務。"
(
  cd "$FRONTEND_DIR"
  npm run preview -- --host 0.0.0.0 --port 4173
)
