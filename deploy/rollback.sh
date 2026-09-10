#!/usr/bin/env bash
# gts 前端藍綠回滾：把 Traefik 流量切回另一個 slot（前一版仍在跑，秒切）
set -euo pipefail

# 與 deploy.sh 共用 slot 判斷與路徑常數，見 lib-slot.sh 開頭那段「壞了三週」的說明
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib-slot.sh
. "$SCRIPT_DIR/lib-slot.sh"

CURRENT=$(current_slot)
PREV=$(other_slot "$CURRENT")

# 先報出要切過去的版本再切。讀的是容器實際的 image（見 slot_image_tag），
# 所以「上次部署失敗過的 slot」不會讓這裡回報一個線上根本不存在的版本。
PREV_TAG=$(slot_image_tag "$PREV" || true)

echo "▶ 切回 $PREV${PREV_TAG:+ (${PREV_TAG})}..."
switch_slot "$PREV"
echo "✅ 已切回 $PREV${PREV_TAG:+ (${PREV_TAG})}"

if [ -z "$PREV_TAG" ]; then
  echo "⚠️  讀不到 ${PREV} 容器的 image tag。流量已切，但請自行確認版本："
  echo "    docker inspect gts_web_store_${PREV} --format '{{.Config.Image}}'"
fi
