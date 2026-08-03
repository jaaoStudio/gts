---
name: TailwindCSS & Design System
description: premium-industrial 設計系統：Tailwind v4 @theme token、字體、UI pattern 與硬規則。寫任何前台樣式、新頁面或改視覺時使用。
---

# TailwindCSS & Design System

> **決策與約束的正典是 `docs/adr/0002-premium-industrial-設計系統.md`**（binding，新頁一律照辦）。
> **token 實值的 single source of truth 是 `src/style.css` 的 `@theme` 區塊。**
> 本 skill 記的是「現況長什麼樣、實務上怎麼寫」，與上面兩者衝突時以它們為準。

## Tailwind v4 CSS-first

- **TailwindCSS ^4.3**，插件 `@tailwindcss/vite`。
- **沒有 `tailwind.config.js`，已移除** — 別再找設定檔或想重建它。
- token 全部定義在 `src/style.css` 的 `@theme`，入口是 `@import "tailwindcss";`。

## Design Tokens（`src/style.css` @theme）

### 字體
| Token | 值 | 用途 |
|---|---|---|
| `font-sans` | Geist Variable | 內文 |
| `font-display` | Space Grotesk Variable | 標題、按鈕文字 |
| `font-mono` | JetBrains Mono Variable | 價格、數字、識別碼、eyebrow |

自 host（`@fontsource-variable/*`，在 `main.js` import），**不外連 Google Fonts**。
中文 fallback：`PingFang TC` / `Noto Sans TC`。

### 顏色

**`brand-*`（工業橘，鎖定重點色）**：50 `#fff7ed` / 100 `#ffedd5` / 200 `#fed7aa` / 300 `#fdba74` /
400 `#fb923c` / **500 `#f97316`（主）** / 600 `#ea580c` / 700 `#c2410c` / 800 `#9a3412` / 900 `#7c2d12`

**`steel-*`（石墨中性，畫布）**：50 `#f7f7f8` / 100 `#ededf0` / 200 `#d9dade` / 300 `#b8bac1` /
400 `#8f929c` / 500 `#6c6f7a` / 600 `#54565f` / 700 `#3f4048` / 800 `#2a2b31` / 900 `#1a1b1f` / 950 `#101115`

**Legacy**：`brand-primary` / `brand-secondary` / `brand-accent` 仍在 `style.css` 供向後相容，
**新程式碼一律用 `brand-*` / `steel-*` 級距**。

### Motion
`--ease-industrial: cubic-bezier(0.32, 0.72, 0, 1)` — 全站的緩動曲線。
（現況：多數元件直接寫成 arbitrary value `ease-[cubic-bezier(0.32,0.72,0,1)]`，
兩者等價；token 形式為 `ease-industrial`。）

## 硬規則（違反就是錯的）

1. **不寫 `dark:` 變體。** 全站 light 鎖定（`:root { color-scheme: light }`）。
   這是過渡狀態，日後導入明暗模式會回到 `@theme` 做語意化 token，不是在元件補 `dark:`。
2. **不寫死 hex**，一律走 token（唯一例外：`ProductCard` 的 badge 背景色來自 Directus 資料）。
3. **一頁一個 accent**，不臨時換色。語意狀態色（紅=錯誤、綠=成功）僅限狀態使用。
4. **圖示只用 Phosphor**（`@phosphor-icons/vue`），不手繪 SVG icon。
5. **進場動畫用 `v-reveal`**（`src/directives/reveal.js`，IntersectionObserver + failsafe），
   不要為此再引入 GSAP ScrollTrigger。

## Base 層（`@layer base`，已全域生效）

- `body`：`bg-steel-50`、`text-steel-900`、`font-sans`、`min-height: 100dvh`
- `h1`–`h4`：自動套 `font-display` + `letter-spacing: -0.02em`（不必每次手加）
- `::selection` = `brand-500`；`:focus-visible` = `2px solid brand-500`, offset 2px
- 自訂 steel 捲軸；`scroll-behavior: smooth`
- `prefers-reduced-motion: reduce` 全域壓掉 animation/transition

## 自訂 utilities（`@layer utilities`）

| Class | 用途 |
|---|---|
| `.bg-blueprint` | 工程格線紋理背景（44px 網格，`rgba(16,17,21,0.04)`），用於 section 背景 |
| `.doc` | 內容頁 prose 樣式（privacy / terms / faq / shipping / warranty）。包住內容即可，內部 `h2/h3/p/ul/li/a/strong` 自動成型 |
| `.scrollbar-hide` | 隱藏捲軸 |

## 實際 UI Pattern（照現有元件抄，勿自創）

### 內容頁骨架
直接用 `components/PageShell.vue`（已含 Navbar + Footer + 標題區），
給 `title` / `eyebrow` / `updated` / `lead`，內容放 slot。
現用於 Privacy / Terms / Faq / Shipping / Warranty / Contact — 新增同類頁面一律沿用：

```vue
<PageShell title="隱私權政策" eyebrow="Legal" updated="2026-07-20">
  <div class="doc"> ... </div>
</PageShell>
```

### Eyebrow 小標（全站慣例）
```html
<p class="font-mono text-xs uppercase tracking-[0.2em] text-brand-600">Section</p>
```

### 卡片（`ProductCard.vue`：同心圓角 + 內核）
外層 `rounded-[1.6rem] bg-white p-1.5 ring-1 ring-steel-900/[0.06]`，
內核 `rounded-[1.15rem] bg-steel-50`。hover：`-translate-y-1` + 加深陰影 + `ring-steel-900/10`，
`duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`。

### 主要 CTA（pill）
```html
<!-- 深色底 → hover 轉橘 -->
<a class="inline-block rounded-full bg-steel-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500">

<!-- 橘底 -->
<a class="inline-flex items-center gap-3 rounded-full bg-brand-500 py-2.5 pl-6 pr-2.5 font-display text-base font-semibold text-white transition-all duration-300 hover:bg-brand-600 active:scale-[0.98]">
```
按鈕一律 **pill（`rounded-full`）**，文字用 `font-display`。

### 價格 / 數字
一律 `font-mono`：`<span class="font-mono text-lg font-semibold tracking-tight text-steel-900">NT$1,200</span>`
（`ProductCard` 慣例：無價時顯示「詢價」，下方附 `起`。）

### 圖示尾綴圓鈕（卡片右下）
`h-10 w-10 rounded-full bg-steel-100 text-steel-700`，group-hover 轉 `bg-brand-500 text-white` 並微位移。

## 響應式

Mobile-first，斷點用 Tailwind 預設（`sm` 640 / `md` 768 / `lg` 1024）。

**容器**：店面主要區塊 `mx-auto max-w-6xl px-5 sm:px-8`（全站最常用）；
內容頁 `max-w-3xl`（由 `PageShell` 提供，勿另寫）。

**商品格線**（兩種，依欄位密度選，勿自創第三種）：
```html
grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3   <!-- 有側欄的列表頁 -->
grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4   <!-- 滿版區塊 -->
```
手機一律 2 欄。
