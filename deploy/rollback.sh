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
#
# ⚠️ 版本從**容器實際的 image** 讀，不是讀 .env 的 ${PREV}_TAG。後者是「打算跑
# 的」——部署若在 pull／up 之後失敗，.env 會留下一個從沒跑起來的 tag，照它寫
# 就會回報一個線上根本不存在的版本（見 lib-slot.sh 的 slot_image_tag 說明）。
PREV_TAG=$(slot_image_tag "$PREV" || true)
if [ -n "$PREV_TAG" ]; then
  sed -i "s/^ACTIVE_TAG=.*/ACTIVE_TAG=${PREV_TAG}/" .env
  echo "✅ 已切回 $PREV (${PREV_TAG})"
else
  echo "✅ 已切回 $PREV"
  echo "⚠️  讀不到 ${PREV} 容器的 image tag，ACTIVE_TAG 未更新。"
  echo "    流量已切,但請自行確認版本：docker inspect gts_web_store_${PREV} --format '{{.Config.Image}}'"
fi
