#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MESSAGE="${1:-更新網站內容}"

git add -A

if git diff --cached --quiet; then
  echo "冇新變更可發佈。"
  exit 0
fi

git commit -m "$MESSAGE"
git push origin "$(git branch --show-current)"

echo "已推送到 GitHub，GitHub Pages 會在幾分鐘內更新。"
