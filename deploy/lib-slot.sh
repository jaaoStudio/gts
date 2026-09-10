#!/usr/bin/env bash
# 藍綠 slot 的共用邏輯。deploy.sh 與 rollback.sh 都 source 這支。
#
# ⚠️ 為什麼要抽出來——這裡曾經有一個讓藍綠部署完全失效三週的 bug：
#
# 兩支腳本原本各自寫一份相同的判斷：
#     CURRENT=$(grep "service: gts-frontend-" "$f" | grep -o 'blue\|green')
#
# 但 gts.yml 裡 `gts-frontend-<slot>@docker` 出現在**兩個** router——正式的
# `gts`（Host gtxin.com.tw）與舊網域轉址的 `legacy-front`（Host jaao.tw）。
# grep -o 因此吐出兩行，CURRENT 實際是 "blue\nblue"，於是
# `[ "$CURRENT" = "blue" ]` 永遠為 false。後果：
#
#   • deploy.sh 每次都部署到**正在服務的那個 slot**：沒有零停機、healthcheck
#     檢查的是已被覆蓋的 live slot（「放棄部署，流量仍在 X」是假的，流量早就
#     在壞掉的新版上）、Traefik 那行 sed 是 blue→blue 白做
#   • rollback.sh 每次都切到自己，**回滾是 no-op**——正式站出事時按回滾沒反應
#
# 同一份錯誤複製在兩處，所以兩處一起壞。
#
# ⚠️ 讀寫要放在一起。`current_slot` 之所以能運作，靠的是寫入端那個**不加錨點**
# 的 `s/…/…/` 會一次改掉所有符合的行；這個不變式必須跟讀取端放在同一個檔案，
# 否則哪天有人動了寫入端（加錨點、改用 yq、新增一條不該被切的 router），
# 讀取端就會開始噴「偵測到 [blue green]」而沒人聯想到是寫入端造成的。

# 路徑常數。呼叫端可用環境變數覆寫（測試時把它們指到暫存目錄）。
COMPOSE_DIR="${COMPOSE_DIR:-$HOME/gts-web}"
TRAEFIK_DYNAMIC="${TRAEFIK_DYNAMIC:-/opt/traefik/dynamic/gts.yml}"

# 目前對外服務的 slot（blue 或 green）。判不出來就回非 0，不猜。
current_slot() {
    local dynamic_file="${1:-$TRAEFIK_DYNAMIC}"
    local found

    # sort -u 收掉「多個 router 指向同一 slot」的重複。
    # 若兩個 router 真的指向不同 slot，這裡會留下 "blue\ngreen"——那是設定不一致，
    # 寧可停下來報錯，也不要選一個猜。
    found=$(grep "service: gts-frontend-" "$dynamic_file" | grep -o 'blue\|green' | sort -u)

    if [ "$found" != blue ] && [ "$found" != green ]; then
        echo "❌ 無法判斷目前 slot：${dynamic_file} 偵測到 [${found}]" >&2
        echo "   預期恰好一個值。請檢查該檔所有 gts-frontend-* 是否指向同一個 slot。" >&2
        return 1
    fi

    printf '%s' "$found"
}

# 另一個 slot（要部署進去、或要回滾過去的那個）
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

# 把流量切到指定 slot（改 Traefik dynamic 檔，file provider 會自動 reload）。
#
# 刻意不加錨點：dynamic 檔裡有多條 router 指向 frontend service，全部都要一起切。
# current_slot 的 `sort -u` 就是建立在「它們永遠一致」這個前提上。
switch_slot() {
    local slot="$1" dynamic_file="${2:-$TRAEFIK_DYNAMIC}"

    other_slot "$slot" >/dev/null || return 1   # 順手驗 slot 名稱合法
    sed -i "s/service: gts-frontend-.*/service: gts-frontend-${slot}@docker/" "$dynamic_file"
}

# 某個 slot **實際正在跑**的 image tag。
#
# ⚠️ 不要用 .env 的 ${SLOT}_TAG 代替——那是「打算跑的」不是「實際在跑的」。
# deploy.sh 必須先把 tag 寫進 .env，compose 才解析得出 image，所以只要部署在
# pull／up 之後失敗，.env 就會留下一個從沒跑起來的 tag。實測重現過：
#
#   blue=A green=B 流量在 blue → 部署 C：.env 先寫 GREEN_TAG=C，接著 pull 失敗
#   → green 實際仍跑 B，但 .env 說 C → 此時回滾到 green 會回報「已切回 (C)」
#
# 容器實際的 image 才是真相。判不出來就回非 0，呼叫端自己決定怎麼處理。
slot_image_tag() {
    local slot="$1"
    local image tag

    image=$(docker inspect "gts_web_store_${slot}" --format '{{.Config.Image}}' 2>/dev/null || true)
    tag="${image##*:}"

    # 兩種「其實沒帶 tag」的情況都要擋掉，否則會把不是 tag 的東西當 tag 回傳：
    #   gts/x             → ##*: 原封不動回傳整串
    #   harbor:5000/gts/x → ##*: 回 "5000/gts/x"（那是 registry 的 port）
    # 判斷依據是「tag 裡不可能出現 /」，比列舉 registry 的寫法可靠。
    if [ -z "$image" ] || [ "$tag" = "$image" ] || [ "${tag%%/*}" != "$tag" ]; then
        echo "❌ 讀不到 gts_web_store_${slot} 的 image tag（.Config.Image = [${image}]）" >&2
        return 1
    fi

    printf '%s' "$tag"
}

# 目前對外的版本。現算而不是讀 .env 的欄位——快取一個會過期的答案，
# 只會製造「快取與現實不符」那一整類 bug（.env 曾經就是這樣騙過回滾腳本）。
active_tag() {
    slot_image_tag "$(current_slot "${1:-$TRAEFIK_DYNAMIC}")"
}
