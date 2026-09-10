# 專案現況與待補缺口

> 這份記「**現在到哪了、還缺什麼**」。技術慣例看 `.claude/skills/`，
> 設計決策看 `docs/adr/`，術語看 `CONTEXT.md`。
> 最後更新：2026-09-10。

## 這是什麼站

**型錄詢價站**，不是電商。客人瀏覽商品 → 送出訂購單 → 老闆確認金額與庫存 → 匯款 → 出貨。
沒有線上結帳。價格是**參考價**，老闆確認後的金額才算數（`docs/proposals/訂購單.md`）。

## 已完成

| 階段 | 狀態 |
|---|---|
| 顧客端店面 premium-industrial redesign（含 Account／Admin／登入頁） | ✅ 2026-07-21 全站視覺一致 |
| 商品分類重整（M2M、每品 [父,子]） | ✅ 2026-07，56 個分類 |
| 訂購單流程（購物車 → 送出 → 追蹤 → 通知信） | ✅ 2026-09，含新單通知與客人確認信 |
| 預估運費（滿額免運） | ✅ 2026-09 |
| 自動化測試（vitest）＋ ESLint ＋ CI 關卡 | ✅ 2026-09 |
| 藍綠部署 ＋ 過期檢查 ＋ 回滾 | ✅ 2026-09-10（先前失效三週，見 `deploy-ops` 雷區 0） |

視覺系統的細節在 `docs/adr/0002` 與 `.claude/skills/tailwind-design-system`。

## 待補缺口（都是功能／收尾，不是設計）

2026-07-21 盤點，尚未逐項複查：

1. **`Admin.vue` 只有殼、無 CRUD** —— 顯示「商品分類管理功能即將上線」placeholder，
   後台目前實際靠 Directus admin UI。
2. **`settings.js` 的 `lineId` 有抓但全站無處使用** —— 可做浮動 LINE 按鈕。
3. **Footer 連結全是死的** —— 社群／客服／隱私權／服務條款／網站地圖都是 `href="#"`；
   首頁訂閱表單 `@submit.prevent` 但無後端。
4. **隱私權／服務條款／常見問題頁面與路由不存在。**
5. **無 SEO / OG meta**，只有 `<title>`。
6. **dead components**：`HeroParallax.vue`、`GridDistortion.vue` 仍在 repo 但無人 import
   （three.js 還在 deps，已被 tree-shake 出主 bundle）。

其他已知的小 TODO：`productService.js` 的 `tags[0]`「主標籤不可預測」；
`customer_level`、`Cart` 目前僅佔位未實作。

## 下一步

**串接 PayUni 統一金流**（2026-08-31 確認方向）。

- 官方文件全站 111 頁已轉錄成**全域** skill `~/.claude/skills/payuni-api/`
  （含 AES-256-GCM 加解密規格與 Node.js 範例）。
- 文件站是自架 ShowDoc，可匿名重抓：`POST /server/index.php?s=/api/page/info`，
  body `page_id=N`。
- **專案內尚無任何 PayUni 程式碼。** 開工後的專案專屬決策再建 project skill。

金流上線會淘汰目前的人工對帳（`payment_note` 那一套），所以**現在不值得為對帳增加機制**
——見 `docs/proposals/訂購單.md` 的「對帳作業規則」。

## 邊界：哪些東西不在這個 repo

- **Directus 後端**（collection／權限／Flow／欄位說明）在德國 VM 上，schema 不在版控。
  查詢與修改手法見 `.claude/skills/directus-schema-fetcher`。
- **Cloudflare Worker**（SSO callback double-tap）見 `docs/adr/0001`。
- **VM 上的部署腳本**需手動 `scp` 同步，見 `.claude/skills/deploy-ops`。
