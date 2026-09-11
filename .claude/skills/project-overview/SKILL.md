---
name: GTS Web Store - Project Overview
description: 專案的技術棧、目錄結構、環境變數與正典文件索引。開始任何不熟悉的任務、或需要知道「東西放哪、該讀哪份文件」時先看這份。
---

# GTS Web Store — Project Overview

**金同心實業**（GTS Hardware）五金工具店面前台。Vue 3 SPA + Directus headless CMS，Google SSO 登入。

> **型錄 + 訂購單，但站上不收款。**
> 客人可把品項送成一張**訂購單**，老闆在 Directus 後台確認金額後，客人依通知信的
> 匯款資訊自行轉帳。**沒有線上刷卡、沒有即時庫存扣減、沒有物流串接。**
> 商品無價時顯示「詢價」，可與有價品項混在同一張單裡。
> 部分商品另有外部通路連結（iOPEN Mall / 蝦皮），那是導流出去、不在本站成交。
>
> 領域詞彙（User/Customer/Admin、Product/Variant/顯示價/詢價/Category/Tag/精選、
> 訂購單/訂購單號/確認單價/狀態/外部通路）的正典是根目錄 **`CONTEXT.md`**，
> 動到這些字眼前先讀。訂購單的完整設計與踩雷紀錄在 **`docs/proposals/訂購單.md`**。

## 技術棧

| 層 | 技術 | 版本 |
|---|---|---|
| Framework | Vue 3（Composition API, `<script setup>`）| ^3.5 |
| Build | Vite | **^8.1** |
| State | Pinia（Options API 風格）| ^3.0 |
| Router | Vue Router | **^5.1** |
| Styling | TailwindCSS **v4（CSS-first，無 config 檔）** | ^4.3 |
| Backend | Directus 11（`@directus/sdk`）| SDK ^23 |
| 動畫 | GSAP + 自製 `v-reveal` directive | ^3.15 |
| 圖示 | `@phosphor-icons/vue` | ^2.2 |
| 字體 | `@fontsource-variable/*`（自 host）| — |
| 消毒 | DOMPurify（rich-text `v-html` 前必用）| ^3.4 |
| Dev HTTPS | `vite-plugin-mkcert` | ^2.1 |
| 部署 | Docker（node:24 → nginx）+ Traefik 藍綠 | — |

**已移除、別再引用**：`axios`（改用 SDK）、`three`（舊 hero 特效）、`tailwind.config.js`。

## 目錄結構

```
src/
├── main.js               # 入口：pinia → router → v-reveal → authStore.init() 完成後才 mount
├── App.vue               # 只有 <router-view />
├── style.css             # Tailwind v4 @theme tokens + base + utilities（設計系統正典）
├── components/
│   ├── Navbar.vue        # 分類選單、搜尋、使用者選單
│   ├── Footer.vue
│   ├── PageShell.vue     # 內容頁骨架（Navbar+標題區+Footer），法務/FAQ 類頁面一律用
│   ├── ProductCard.vue
│   ├── HeroProductRing.vue / HeroRingCard.vue   # 首頁商品轉盤
│   ├── LineButton.vue    # LINE 聯絡鈕（有 floating prop，但 Footer/Contact 目前都用內嵌）
│   └── OrderStatusChip.vue  # 訂購單狀態標籤，顏色與 Directus 後台對齊
├── views/                # 16 個：Home / Products / ProductDetail / Contact / Faq /
│                         # Shipping / Warranty / Privacy / Terms / AdminLogin(=/login) /
│                         # AdminCallback / Account /
│                         # OrderForm(=/order) / OrderDone / OrderHistory / OrderDetail
│                         # （+ OrderDetail.test.js，唯一的元件測試）
├── stores/               # auth / product / category / settings / order
├── services/             # productService（+ productMapper）/ customerService /
│                         # settingsService / orderService
├── directives/reveal.js  # v-reveal：IntersectionObserver + failsafe（勿改回 ScrollTrigger）
├── utils/
│   ├── directus.js       # SDK 單例（session 模式）+ getAssetUrl()
│   └── seo.js            # setMeta()：runtime 改 <head> meta（目前僅 ProductDetail 用它設 og:*）
│                         # ⚠ SPA runtime 設定，LINE/FB 爬蟲不執行 JS 故讀不到，
│                         #   要精準社群卡需 SSR/預渲染
└── router/index.js       # 路由 + 守衛 + afterEach 套 meta.title
```

**分層規則**：元件**不直接**呼叫 Directus → 走 Pinia store → store 委派 service → service 用 SDK。

## 環境變數

| 變數 | 用途 |
|---|---|
| `VITE_DIRECTUS_URL` | API base。正式站為相對路徑 `/api`（經 nginx 反代，與前端同源）|
| `VITE_DIRECTUS_PUBLIC_URL` | 對外絕對網址，供 assets 與 SSO 導向用（`https://core.gtxin.com.tw`）|

⚠️ **`VITE_*` 是 build-time 烘進靜態檔的**，換後端網址必須重 build image，改容器環境變數無效。

## 指令

```bash
npm run dev       # Vite dev server（HTTPS，port 5174，https://local.gtxin.com.tw:5174）
npm run build     # → dist/
npm run preview
```

測試用 **vitest**（`npm test`），lint 用 **ESLint**（`npm run lint`，帶 `--max-warnings 0`）。
兩者都是 PR 的 required check，見 `.github/workflows/test.yml`；註解與文件的分工規則見 `CLAUDE.md`。

## 正典文件與 skill 索引

| 主題 | 去哪看 |
|---|---|
| 領域詞彙 | `CONTEXT.md` |
| Google SSO / Worker double-tap | `docs/adr/0001` + skill `routing-and-auth` |
| 設計系統決策 | `docs/adr/0002` + skill `tailwind-design-system` |
| 運費為何是預估值、不進應付金額 | `docs/adr/0003` |
| `payment_note` 的對帳規則（為何不做回報通知信、為何關掉 readonly） | `docs/adr/0004` |
| Directus 資料結構 | skill `directus-schema-fetcher`（抓即時 schema，**碰資料層前先跑**）|
| service / mapper 寫法 | skill `directus-service-layer` |
| 商品分類批次維運 | skill `directus-catalog-categorization` |
| 部署 / 回滾 / 線上除錯 | skill `deploy-ops` |
| 訂購單（資料模型／權限／Flow／踩雷） | `docs/proposals/訂購單.md` |
| GSAP：API 用法 | **全域 plugin `gsap-skills`**（本專案不留自己的 GSAP skill）|
| GSAP：本專案踩過的雷（NaN 凍結、iOS hover、IO 多筆 entry）| skill `vue-component-conventions` |
| **手機專屬 bug 除錯** | skill `mobile-debugging` |
| **Vue SFC 慣例（含 await 前後讀 reactive 的坑）** | skill `vue-component-conventions` |
| **專案定位與「哪些東西不在 repo」** | `docs/status.md` |
| **寫 code 的通用慣例（註解該放哪）** | `CLAUDE.md` |

> ⚠️ 新增任何 skill 或 `docs/` 文件時，**同一個 commit 要在這張表補一列**。
> 沒進索引的文件沒人會讀到，也就沒人會發現它過時了——`docs/status.md` 的
> 六條缺口清單就是這樣爛掉的（2026-09-10 逐條核對後全部不成立）。

## 現況已知缺口

- **前台沒有管理員介面**（`views/Admin.vue` 與 `/admin` 路由已於 2026-09 移除，
  原因見 skill `routing-and-auth` 的 Directus 11 `admin_access` 那節）。
  老闆一律在 Directus 後台處理訂購單（有「待處理訂購單」書籤）。
  日後若要做，規劃是獨立的後台網站（另一個網域），不是本站的路由。
- `src/assets/` 有一張 5MB 的 jpg，未經最佳化。
- 上線前 `site_settings` 必填：匯款銀行／帳號／戶名（缺一即視為未設定，
  客人會看到「請直接與我們聯絡」）、滿額免運門檻與預設運費（未填則一律不免運）、
  訂單通知信箱。

## 訂購單相關的硬規則

- **`orders.customer` 客戶端無權寫入**（送了會 403），由 `items.create` 的 flow
  依登入帳號補上。因此建立當下讀不回自己的單（HTTP 204），前端是靠
  「記錄送出前的最大 id → 輪詢等新單出現」取得訂單。
- **金額一律由後端算**。`confirmed_total` 在每次存檔時重算，欄位為唯讀。
- **新增 Directus 欄位後必須檢查所有 policy 的欄位清單**：`customer access` 對
  `products` / `site_settings` 等是逐一列欄位，查一個沒開放的欄位會讓**整個請求**
  回 FORBIDDEN。曾因此讓已登入客戶連商品頁都打不開。
- **權限相關的驗證一律用非管理員帳號**：管理員 `admin_access=true` 會繞過所有
  policy，用它測等於沒測。
