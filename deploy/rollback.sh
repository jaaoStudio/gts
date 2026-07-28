#!/usr/bin/env bash
# gts 前端藍綠回滾：把 Traefik 流量切回另一個 slot（前一版仍在跑，秒切）
set -euo pipefail

TRAEFIK_DYNAMIC=/opt/traefik/dynamic/gts.yml

CURRENT=$(grep "service: gts-frontend-" "$TRAEFIK_DYNAMIC" | grep -o 'blue\|green')
if [ "$CURRENT" = "blue" ]; then PREV=green; else PREV=blue; fi

echo "▶ 切回 $PREV..."
sed -i "s/service: gts-frontend-.*/service: gts-frontend-${PREV}@docker/" "$TRAEFIK_DYNAMIC"
echo "✅ 已切回 $PREV"
