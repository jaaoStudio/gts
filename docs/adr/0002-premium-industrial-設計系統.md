---
status: accepted
---

# Premium-industrial 前台設計系統

## Decision

前台(顧客端 + 會員/後台頁)統一採用一套 **premium-industrial** 設計語言,並作為往後**所有前台頁面的 binding 規範**——新頁一律照辦。Token 的實際數值以 `src/style.css` 的 Tailwind v4 `@theme` 區塊為 single source of truth,本 ADR 只記綁定的決策與約束。

綁定約束:

1. **Light 主題鎖定,現階段全站不做 dark mode**,刻意不使用 `dark:` variant。這是**暫定**決策:日後**會**導入明暗模式,屆時另開 ADR;在那之前**不要**半套加入 dark,以免破壞一致性。為了讓未來切換省力,顏色一律走 `@theme` token、勿寫死 hex。
2. **單一鎖定重點色**:工業橘 `brand-*`(accent)+ 石墨中性 `steel-*`。一頁一個 accent,不臨時換色;語意狀態色(紅=錯誤、綠=成功)例外但僅限狀態。
3. **Tailwind v4 CSS-first**:token 定義在 `style.css` 的 `@theme`,**已移除 `tailwind.config.js`**(後人別再找設定檔;PostCSS 用 `@tailwindcss/vite`)。
4. **字體**:`Space Grotesk`(display / 標題)、`Geist`(body)、`JetBrains Mono`(數字、識別碼、eyebrow);自 host,不外連 Google Fonts。
5. **圖示只用 Phosphor**(`@phosphor-icons/vue`),不手繪 SVG icon。
6. **進場動畫 `v-reveal`(`src/directives/reveal.js`)用 IntersectionObserver,不用 GSAP ScrollTrigger**,且必附 failsafe timer。

## Context

前台為視覺導向的電商店面,需要一致、可辨識的品牌質感。散落的 utility class 與臨時配色會讓品牌變糊,故收斂成鎖定的 token 系統與少數硬規則。

第 6 點有具體痛點:早期 `v-reveal` 用 ScrollTrigger + `start:'top 88%'`,當區塊依賴非同步資料延遲掛載、或上方圖片載入後版面位移時,觸發座標會算錯、`onEnter` 不觸發,區塊永久卡在 `opacity:0`(首頁 Categories、加入會員 CTA 曾因此時有時無)。改用 IntersectionObserver 對照即時版面、已在畫面內者立即顯示,並加 2.5s failsafe 保證內容不可能永久隱形。

## Consequences

- 全站前後台(含 `Account`/`Admin`/`AdminCallback`/`AdminLogin`)已移除舊的 `slate` + `dark:` + orange 樣式,改為此系統,視覺一致。
- Light-only 是已知的**過渡狀態**;導入明暗模式時,務必回到 `@theme` token 層做語意化 token 與 `prefers-color-scheme` 切換,而非在各元件補 `dark:`。
- `brand-primary`/`brand-secondary`/`brand-accent` 等 legacy token 仍保留於 `style.css` 供向後相容,新程式碼一律用 `brand-*`/`steel-*` 級距。
