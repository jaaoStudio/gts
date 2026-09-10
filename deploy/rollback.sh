#!/usr/bin/env bash
# gts 前端藍綠回滾：把 Traefik 流量切回另一個 slot（前一版仍在跑，秒切）
set -euo pipefail

COMPOSE_DIR=~/gts-web
TRAEFIK_DYNAMIC=/opt/traefik/dynamic/gts.yml

# 與 deploy.sh 共用 slot 判斷，見 lib-slot.sh 開頭那段「壞了三週」的說明
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib-slot.sh
. "$SCRIPT_DIR/lib-slot.sh"

cd "$COMPOSE_DIR"

CURRENT=$(current_slot "$TRAEFIK_DYNAMIC")
PREV=$(other_slot "$CURRENT")

echo "▶ 切回 $PREV..."
sed -i "s/service: gts-frontend-.*/service: gts-frontend-${PREV}@docker/" "$TRAEFIK_DYNAMIC"

# ACTIVE_TAG 要跟著切，否則它會停在回滾前那一版。
# deploy.sh 的同版守衛已改成讀 ${CURRENT_UPPER}_TAG（實際服務的 slot）而不是
# 這個欄位，所以這裡不同步不會造成誤判；但 .env 註解說它是「目前對外的 tag」，
# 留一個對不上的數字給人看，遲早會有人照著它下判斷。
PREV_UPPER=$(echo "$PREV" | tr '[:lower:]' '[:upper:]')
PREV_TAG=$(grep "^${PREV_UPPER}_TAG=" .env | cut -d= -f2- || true)
if [ -n "$PREV_TAG" ]; then
  sed -i "s/^ACTIVE_TAG=.*/ACTIVE_TAG=${PREV_TAG}/" .env
  echo "✅ 已切回 $PREV (${PREV_TAG})"
else
  echo "✅ 已切回 $PREV"
  echo "⚠️  .env 讀不到 ${PREV_UPPER}_TAG，ACTIVE_TAG 未更新（流量已切，僅追蹤欄位失準）"
fi
