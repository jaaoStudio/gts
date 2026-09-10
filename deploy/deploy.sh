#!/usr/bin/env bash
# gts 前端藍綠部署（放在 VM 的 ~/gts-web/，由 GitHub Actions SSH 觸發）
# 用法：./deploy.sh <image-tag>   （tag 通常是 github.sha）
set -euo pipefail

NEW_TAG="${1:?需要傳入 image tag}"

# slot 判斷與路徑常數都在 lib-slot.sh。讀不到就讓 set -e 直接中止——寧可不部署，
# 也不要在判不出 slot 的情況下亂寫（同步到 VM 時三支要一起放）。
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib-slot.sh
. "$SCRIPT_DIR/lib-slot.sh"

cd "$COMPOSE_DIR"

# 1. 判斷目前 active slot（讀 Traefik dynamic 檔）
CURRENT=$(current_slot)
NEXT=$(other_slot "$CURRENT")
NEXT_UPPER=${NEXT^^}

echo "▶ 目前: $CURRENT → 部署到: $NEXT (tag: $NEW_TAG)"

# 1.5 同一個 tag 不重複部署。
#
# 重複部署會把流量切到另一個 slot，而那個 slot 隨即被同一版蓋掉——rollback
# 目標於是從「前一版」變成「同一版」，回滾等於沒有回滾。這個坑在 Actions 上
# 看不出來（兩次都綠燈），要等到真的需要回滾時才會發現退不回去。
#
# 這是 workflow 端 freshness 檢查之外的第二道防線：那一關擋的是「舊 commit
# 蓋掉新的」，這一關擋的是「同一版把 rollback 目標吃掉」。
#
# `|| true`：讀不到就當空字串繼續——這道守衛是加分項，不該成為部署的單點故障。
ACTIVE=$(active_tag || true)
if [ -n "$ACTIVE" ] && [ "$NEW_TAG" = "$ACTIVE" ]; then
  echo "⏭ ${NEW_TAG} 已經是目前對外的版本，跳過部署。"
  echo "   流量留在 ${CURRENT}，${NEXT} 保持為 rollback 目標。"
  exit 0
fi

# 2. 更新 next slot 的 tag 到 .env（compose 要靠它解析 image，所以必須先寫）
sed -i "s/^${NEXT_UPPER}_TAG=.*/${NEXT_UPPER}_TAG=${NEW_TAG}/" .env

# 3. Pull 新 image
docker compose pull "gts_web_store_${NEXT}"

# 4. 起 next slot（不動 current，保留給 rollback 立即切回）
echo "▶ 啟動 ${NEXT} 容器..."
docker compose up -d --no-deps "gts_web_store_${NEXT}"

# 5. 等 healthcheck（最多 2 分鐘）
echo "▶ 等待健康檢查..."
for i in $(seq 1 12); do
  STATUS=$(docker inspect "gts_web_store_${NEXT}" \
    --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  echo "  [$i/12] $STATUS"
  [ "$STATUS" = "healthy" ] && break
  [ "$i" -eq 12 ] && { echo "❌ 健康檢查逾時，放棄部署（流量仍在 ${CURRENT}）"; exit 1; }
  sleep 10
done

# 6. 切換 Traefik 流量
echo "▶ 切換流量到 ${NEXT}..."
switch_slot "$NEXT"

echo "✅ 完成！流量已切到 ${NEXT} (${NEW_TAG})"
echo "   回滾：~/gts-web/rollback.sh   或   GitHub Actions → Rollback"
