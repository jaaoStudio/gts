#!/usr/bin/env bash
# 藍綠 slot 的判斷邏輯。deploy.sh 與 rollback.sh 共用。
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
# 同一份錯誤複製在兩處，所以兩處一起壞。邏輯集中在這裡，以後只會有一個地方要修。

# 目前對外服務的 slot（blue 或 green）。判不出來就回非 0，不猜。
current_slot() {
    local dynamic_file="$1"
    local found

    # sort -u 收掉「多個 router 指向同一 slot」的重複。
    # 若兩個 router 真的指向不同 slot，這裡會留下兩個值——那是設定不一致，
    # 寧可停下來報錯，也不要選一個猜。
    found=$(grep "service: gts-frontend-" "$dynamic_file" | grep -o 'blue\|green' | sort -u)

    if [ "$(printf '%s\n' "$found" | grep -c .)" -ne 1 ]; then
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
