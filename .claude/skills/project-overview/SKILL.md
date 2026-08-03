---
name: GTS Web Store - Project Overview
description: 專案的技術棧、目錄結構、環境變數與正典文件索引。開始任何不熟悉的任務、或需要知道「東西放哪、該讀哪份文件」時先看這份。
---

# GTS Web Store — Project Overview

**金同心實業**（GTS Hardware）五金工具店面前台。Vue 3 SPA + Directus headless CMS，Google SSO 登入。

> **這是型錄詢價站，不是交易站** — 沒有購物車、結帳、金流。
> 商品無價時顯示「詢價」，成交走電話。Navbar 的購物車鈕目前刻意隱藏（`8b5a91a`）。
> 領域詞彙（User/Customer/Admin、Product/Variant/顯示價/詢價/Category/Tag/精選）
> 的正典是根目錄 **`CONTEXT.md`**，動到這些字眼前先讀。

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
│   └── LineButton.vue    # LINE 聯絡鈕（有 floating prop，但 Footer/Contact 目前都用內嵌）
├── views/                # 13 個：Home / Products / ProductDetail / Contact / Faq /
│                         # Shipping / Warranty / Privacy / Terms / AdminLogin(=/login) /
│                         # AdminCallback / Account / Admin
├── stores/               # auth / product / category / settings
├── services/             # productService（+ productMapper）/ customerService / settingsService
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
| `VITE_DIRECTUS_PUBLIC_URL` | 對外絕對網址，供 assets 與 SSO 導向用（`https://gts-core.jaao.tw`）|

⚠️ **`VITE_*` 是 build-time 烘進靜態檔的**，換後端網址必須重 build image，改容器環境變數無效。

## 指令

```bash
npm run dev       # Vite dev server（HTTPS，port 5174，https://local.jaao.tw:5174）
npm run build     # → dist/
npm run preview
```

沒有測試框架與 lint 設定（現況如此，非遺漏待補的暗示）。

## 正典文件與 skill 索引

| 主題 | 去哪看 |
|---|---|
| 領域詞彙 | `CONTEXT.md` |
| Google SSO / Worker double-tap | `docs/adr/0001` + skill `routing-and-auth` |
| 設計系統決策 | `docs/adr/0002` + skill `tailwind-design-system` |
| Directus 資料結構 | skill `directus-schema-fetcher`（抓即時 schema，**碰資料層前先跑**）|
| service / mapper 寫法 | skill `directus-service-layer` |
| 商品分類批次維運 | skill `directus-catalog-categorization` |
| 部署 / 回滾 / 線上除錯 | skill `deploy-ops` |

## 現況已知缺口

- `views/Admin.vue` 只有殼、無 CRUD；後台實務上直接用 Directus admin UI。
- `src/assets/` 有一張 5MB 的 jpg，未經最佳化。
