#!/usr/bin/env bash
# 判斷「這次 run 的 commit 是否還值得部署」。deploy.yml 的兩個檢查點共用。
#
# 用法：deploy-freshness.sh <this-sha>
# 離開碼：0 = 應該部署　10 = 已過期，應跳過　其他 = 腳本自己出錯（呼叫端別當成過期）
set -euo pipefail

THIS_SHA="${1:?需要傳入本次 run 的 commit SHA}"

git fetch --quiet origin main
HEAD_SHA=$(git rev-parse FETCH_HEAD)

if [ "$HEAD_SHA" = "$THIS_SHA" ]; then
    echo "✅ ${THIS_SHA} 仍是 main 的 HEAD"
    exit 0
fi

# SHA 不同不代表過期：要問的是「之後的提交裡有沒有與部署相關的變更」。
# 若只比 SHA，一個純文件提交就會讓前面那個程式提交判定過期而跳過，而它自己
# 又被 paths-ignore 排除、不會觸發部署——那份程式更新就沒有任何 run 承接。
#
# ⚠️ 排除樣式必須與 deploy.yml 的 on.push.paths-ignore 一致，兩處要一起改。
IGNORE_RE='(\.md$|^\.claude/|^docs/|^deploy/)'

RELEVANT=$(git diff --name-only "${THIS_SHA}..${HEAD_SHA}" | grep -vE "$IGNORE_RE" || true)

if [ -z "$RELEVANT" ]; then
    echo "✅ main 已前進到 ${HEAD_SHA}，但這之間只有不影響部署的變更（文件／VM 腳本）"
    echo "   因此仍由本次 run 部署 ${THIS_SHA}，否則這份程式更新會沒有 run 承接。"
    exit 0
fi

echo "⏭ main 已前進到 ${HEAD_SHA}，且含有與部署相關的變更："
printf '%s\n' "$RELEVANT" | sed 's/^/     /'
echo "   ${THIS_SHA} 已過期，交給較新的 run 去部署。"
exit 10
