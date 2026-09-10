#!/usr/bin/env bash
# 藍綠 slot 的共用邏輯。deploy.sh 與 rollback.sh 都 source 這支。
#
# 讀寫都放這裡，是因為兩者互相依賴（見 switch_slot）。這份邏輯先前複製在兩支
# 腳本裡，同一個 bug 讓部署與回滾一起失效三週——事件經過見
# .claude/skills/deploy-ops/SKILL.md 的「雷區 0」。

# 路徑常數。可用環境變數覆寫（測試時指到暫存目錄）。
COMPOSE_DIR="${COMPOSE_DIR:-$HOME/gts-web}"
TRAEFIK_DYNAMIC="${TRAEFIK_DYNAMIC:-/opt/traefik/dynamic/gts.yml}"

# 目前對外服務的 slot。判不出來就回非 0，不猜。
current_slot() {
    local dynamic_file="${1:-$TRAEFIK_DYNAMIC}"
    local found

    # dynamic 檔有多條 router 指向 frontend service，sort -u 收掉重複。
    # 若它們指向不同 slot 則留下兩個值——那是設定不一致，報錯而不是選一個。
    found=$(grep "service: gts-frontend-" "$dynamic_file" | grep -o 'blue\|green' | sort -u)

    if [ "$found" != blue ] && [ "$found" != green ]; then
        echo "❌ 無法判斷目前 slot：${dynamic_file} 偵測到 [${found}]" >&2
        echo "   預期恰好一個值。請檢查該檔所有 gts-frontend-* 是否指向同一個 slot。" >&2
        return 1
    fi

    printf '%s' "$found"
}

other_slot() {
    case "$1" in
        blue)
            printf 'green'
            ;;
        green)
            printf 'blue'
            ;;
        *)
            echo "❌ 未知的 slot：[$1]（預期 blue 或 green）" >&2
            return 1
            ;;
    esac
}

# 把流量切到指定 slot（Traefik file provider 會自動 reload）。
#
# ⚠️ sed 刻意不加錨點：多條 router 必須一起切，而 current_slot 的 sort -u 正是
# 建立在「它們永遠一致」上。動這行就會讓 current_slot 開始報「偵測到 [blue green]」。
switch_slot() {
    local slot="$1" dynamic_file="${2:-$TRAEFIK_DYNAMIC}"

    other_slot "$slot" >/dev/null || return 1   # 順手驗 slot 名稱合法
    sed -i "s/service: gts-frontend-.*/service: gts-frontend-${slot}@docker/" "$dynamic_file"
}

# 某個 slot **實際正在跑**的 image tag。
#
# ⚠️ 不要改成讀 .env 的 ${SLOT}_TAG：那是「打算跑的」，部署在 pull／up 之後
# 失敗就會留下一個從沒跑起來的 tag。容器的 image 才是真相。
slot_image_tag() {
    local slot="$1"
    local image tag

    image=$(docker inspect "gts_web_store_${slot}" --format '{{.Config.Image}}' 2>/dev/null || true)
    tag="${image##*:}"

    # 擋掉「其實沒帶 tag」：gts/x 會原封不動回傳，harbor:5000/gts/x 會回
    # "5000/gts/x"。判準是 tag 裡不可能有 /。
    if [ -z "$image" ] || [ "$tag" = "$image" ] || [ "${tag%%/*}" != "$tag" ]; then
        echo "❌ 讀不到 gts_web_store_${slot} 的 image tag（.Config.Image = [${image}]）" >&2
        return 1
    fi

    printf '%s' "$tag"
}

# 目前對外的版本。現算而不是快取成 .env 欄位——快取會過期並騙人。
active_tag() {
    slot_image_tag "$(current_slot "${1:-$TRAEFIK_DYNAMIC}")"
}
