#!/usr/bin/env bash
# 判斷「這次 run 的 commit 是否還值得部署」。
#
# 由 deploy.yml 的兩個檢查點共用：freshness job（早期攔阻，省下建置）與
# build-and-deploy 內的最後一道（擋 re-run failed jobs 繞過前者）。
# 邏輯只寫這一份——兩處各寫一份必然會漂移，而漂移的後果是正式站被蓋錯版本。
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

# main 已經往前走，但不代表這次部署就沒意義。
#
# 反例（review 指出的漏部署）：程式提交 A 正在跑測試時，main 進來一個純文件
# 提交 B。若只比對 SHA，A 會判定過期而跳過；而 B 又被 deploy.yml 的
# paths-ignore 排除、根本不會觸發部署——於是 A 的程式更新沒有任何 run 承接，
# 正式站停在 A 之前的版本，直到下一次「剛好會觸發」的提交。
#
# 所以真正要問的是：A 之後的那些提交裡，**有沒有任何與部署相關的變更**。
# 全都是文件就繼續部署 A；有程式變更才讓後面那個 run 去做。
#
# ⚠️ 下面的排除樣式必須與 deploy.yml 的 on.push.paths-ignore 一致，兩處要一起改：
#     '**.md' → \.md$      '.claude/**' → ^\.claude/
#     'docs/**' → ^docs/   'deploy/**' → ^deploy/
IGNORE_RE='(\.md$|^\.claude/|^docs/|^deploy/)'

CHANGED=$(git diff --name-only "${THIS_SHA}..${HEAD_SHA}")
RELEVANT=$(printf '%s\n' "$CHANGED" | grep -vE "$IGNORE_RE" || true)
RELEVANT=$(printf '%s' "$RELEVANT" | tr -d '[:space:]')

if [ -z "$RELEVANT" ]; then
    echo "✅ main 已前進到 ${HEAD_SHA}，但這之間只有不影響部署的變更（文件／VM 腳本）"
    echo "   因此仍由本次 run 部署 ${THIS_SHA}，否則這份程式更新會沒有 run 承接。"
    exit 0
fi

echo "⏭ main 已前進到 ${HEAD_SHA}，且含有與部署相關的變更："
printf '%s\n' "$CHANGED" | grep -E -v "$IGNORE_RE" | sed 's/^/     /'
echo "   ${THIS_SHA} 已過期，交給較新的 run 去部署。"
exit 10
