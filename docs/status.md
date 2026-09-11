# 專案定位與邊界

> 這份只放**不會腐爛**的東西：這個站是什麼、哪些東西不在這個 repo。
>
> - 技術棧、目錄結構、正典索引 → `.claude/skills/project-overview`
> - 術語 → `CONTEXT.md`
> - 設計決策 → `docs/adr/`
> - 待辦與缺口 → **GitHub issues**（`gh issue list`），不寫在這裡，理由見文末

## 這是什麼站

**型錄詢價站**，不是電商。客人瀏覽商品 → 送出訂購單 → 老闆確認金額與庫存 → 匯款 → 出貨。
沒有線上結帳。價格是**參考價**，老闆確認後的金額才算數。

完整的領域詞彙（Product/Variant/詢價/混單、外部通路導流）見 `CONTEXT.md`；
訂購單流程的設計決定見 `docs/proposals/訂購單.md`。

## 邊界：哪些東西不在這個 repo

這是最容易踩到的一類問題——改了半天發現東西不在這裡。

| 不在 repo | 在哪 | 怎麼查／改 |
|---|---|---|
| **Directus 後端**（collection／權限／Flow／欄位說明） | 德國 VM，schema 不進版控 | `.claude/skills/directus-schema-fetcher` |
| **Cloudflare Worker**（SSO callback double-tap） | CF 帳號 | `worker/auth-callback-worker.js` 是原始碼，部署在 CF；見 `docs/adr/0001` |
| **VM 上的部署腳本** | `~/gts-web/`，需手動 `scp` | `.claude/skills/deploy-ops` |
| **PayUni 金流文件**（111 頁轉錄） | 全域 skill，不在本 repo | `~/.claude/skills/payuni-api/` |

## 下一步

**串接 PayUni 統一金流**（2026-08-31 確認方向）。專案內尚無任何 PayUni 程式碼；
串接手法與加解密規格看上表那支全域 skill，開工後的專案專屬決策再建 project skill。

金流上線會淘汰目前的人工對帳（`payment_note` 那一套），所以**現在不值得為對帳增加機制**
——見 `docs/proposals/訂購單.md` 的「對帳作業規則」。

## 為什麼待辦不寫在這份文件裡

這一節原本有一張「六個待補缺口」的清單，是 2026-07-21 的盤點。
2026-09-10 逐條核對後發現**六條全部已經不成立**——`Admin.vue` 已被移除、
LINE 浮動按鈕已上線、Footer 的死連結已修、法務頁面都已存在並有路由、
OG meta 已實作、dead components 與 `three` 都已清掉。

清單本身沒有「關閉」這個動作，所以修好了也不會有人回來劃掉；而 issue 有。
**待辦一律開 issue**（`gh issue list --state all` 看得到歷史），這份文件只留
不會因為別人改了程式而變成假話的內容。
