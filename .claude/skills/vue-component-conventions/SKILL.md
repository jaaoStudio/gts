---
name: Vue Component Conventions
description: Vue 3 SFC 撰寫慣例：結構、狀態流、命名、樣式與動畫。新增或修改任何 .vue 元件時使用。
---

# Vue Component Conventions

> 視覺 token 與 UI pattern 見 skill `tailwind-design-system`；本篇只管元件寫法。

## SFC 結構

一律 `<script setup>`（Composition API），順序：

```
<template> → <script setup> → <style scoped>（少用，見下方樣式段）
```

**不使用 Options API**（Pinia store 例外，store 用 options 風格）。

## Template 規則

1. **頁面骨架**：內容頁（法務 / FAQ / 聯絡類）**直接用 `components/PageShell.vue`**，
   它已含 Navbar + 標題區 + Footer，不要自己拼。
   店面頁自行組裝時根容器用 `min-h-[100dvh] bg-steel-50`（**不是 `min-h-screen`**，
   避免 iOS Safari 網址列造成跳動）。
2. **狀態流**：一律 `v-if="loading"` → `v-else-if="error"` → `v-else`。
3. **Loading 用 skeleton，不要轉圈 spinner**。骨架要貼合最終版面的形狀：
   ```html
   <div v-if="productStore.loading" class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
     <div v-for="i in 6" :key="i" class="aspect-[3/4] animate-pulse rounded-[1.6rem] bg-steel-100" />
   </div>
   ```
4. **Error 用中性卡片，不是紅字**（紅色保留給表單驗證等真正的錯誤語意）：
   ```html
   <div v-else-if="productStore.error"
        class="rounded-2xl border border-steel-200 bg-white py-20 text-center text-steel-500">
     {{ productStore.error }}
   </div>
   ```
5. **容器寬度**：店面區塊 `mx-auto max-w-6xl px-5 sm:px-8`；內容頁由 `PageShell` 決定（`max-w-3xl`）。
6. **區塊註解**：用 HTML 註解標示段落（`<!-- Hero -->`、`<!-- Featured -->`、`<!-- Mobile Menu -->`）。

## Script Setup 規則

1. **import 順序**：Vue API → Vue Router → Pinia store → 元件 → service/utils → 圖示
   ```js
   import { ref, computed, onMounted } from 'vue'
   import { useRoute, useRouter } from 'vue-router'
   import { useProductStore } from '../stores/product'
   import ProductCard from '../components/ProductCard.vue'
   import { setMeta } from '../utils/seo'
   import { PhArrowUpRight } from '@phosphor-icons/vue'
   ```
2. **Store**：`const xxxStore = useXxxStore()` 放在頂層。
3. **Props**：`defineProps({ ... })`，標明 type 與 required/default。
4. **元件不直接呼叫 Directus** — 走 store → service。詳見 skill `directus-service-layer`。
5. **rich-text 一律先消毒**：Directus 來的 HTML 要 `DOMPurify.sanitize()` 後才 `v-html`，防 stored XSS
   （見 `ProductDetail.vue`）。

## 命名

| 類型 | 位置 | 命名 |
|---|---|---|
| 頁面 | `src/views/` | PascalCase（`ProductDetail.vue`）|
| 共用元件 | `src/components/` | PascalCase（`ProductCard.vue`）|

## 樣式

- **主要方法**：Tailwind utility 直接寫在 template。
- **不寫 `dark:`** — 全站 light 鎖定（ADR 0002）。這是刻意決策，不是待補。
- **不寫死 hex**，用 `brand-*` / `steel-*` token。
- **`<style scoped>` 少用**：僅在 Tailwind 表達不了的 keyframes / 複雜選擇器時才開。
- **響應式**：mobile-first，用 `sm:` `md:` `lg:`。
- **過場**：互動元素 `transition-colors duration-300` 或 `transition-all duration-300`；
  卡片類用 `ease-[cubic-bezier(0.32,0.72,0,1)]`（= `--ease-industrial`）。
- **hover**：卡片整體互動用 `group` + `group-hover:`。

## 圖示

只用 **Phosphor**（`@phosphor-icons/vue`），具名 import：
```js
import { PhArrowUpRight, PhMagnifyingGlass } from '@phosphor-icons/vue'
```
`<PhArrowUpRight :size="18" weight="bold" />`。**不手繪 SVG icon**，不混用其他圖示庫。

## 進場動畫

用全域 directive **`v-reveal`**（`src/directives/reveal.js`，IntersectionObserver + failsafe）：

```html
<section v-reveal> ... </section>
```

- **不要為進場效果引入 GSAP ScrollTrigger** — 曾因觸發座標算錯導致區塊永久卡在 `opacity:0`（ADR 0002 第 6 點）。
- GSAP 保留給真正的複雜動畫（如 `HeroProductRing`）。
  ⚠️ 寫入 transform 前務必驗 `isFinite`：NaN 進 transform 會讓元素永久凍結且不自癒。

## 路由導航

- 宣告式：`<router-link :to="...">`
- 程式式：`router.push()` / `router.replace()`
- 篩選走 query：`{ path: '/products', query: { category: slug } }`
