#!/bin/bash

# 取得腳本所在的目錄路徑，確保在哪裡執行都能正確讀到 .env
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
source "$DIR/.env"

# 呼叫 Directus API 取得 Schema，並將結果輸出 (AI 會在背景讀取這個輸出)
curl -s -X GET "https://gts-core.jaao.tw/schema/snapshot" \
     -H "Authorization: Bearer $DIRECTUS_AI_TOKEN"