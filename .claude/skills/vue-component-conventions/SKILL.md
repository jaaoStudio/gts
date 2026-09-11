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
- GSAP 保留給真正的複雜動畫（如 `HeroProductRing`）。**API 用法看全域 plugin
  `gsap-skills`**；下面三節是本專案實際踩過、而官方文件沒有的東西。

## ⚠️ NaN 進 transform 會永久凍結元素，而且不會自癒

GSAP 寫出 `translate(NaNpx, NaNpx)` 這種無效 CSS 時，瀏覽器**整條 transform 拒收**並保留
最後一次有效值；同時 GSAP 內部的快取矩陣被汙染，**之後每一次有效寫入也一併失效**。
結果是元素永久凍結——**即使來源數值早已恢復正常也救不回來**。

### 診斷特徵（2026-07 `HeroProductRing` 實測）

這組特徵很容易誤導，四輪都猜錯過：

- GSAP 內部值（`gsap.getProperty`）**持續正常變化** → 看起來「計算是對的」
- 但 `getComputedStyle(el).transform` 與 `el.style.transform` 從某一刻起**完全凍結**
- 不走 transform 的屬性（`opacity`）仍正常 → 容易誤判成「只有透明度在變」
- 子元素若有獨立 tween（如內層漂浮動畫）**仍會動** → 更容易誤導成「不是凍結」

### NaN 從哪來

GSAP **Draggable + InertiaPlugin**：在 throw 進行中快速連續觸控，
`gsap.getProperty(proxy, 'x')` 會回傳 `NaN`。

### 怎麼防

任何餵進 `gsap.set()` 的計算值，**若源頭來自 Draggable 或 `getProperty`，都要先
`Number.isFinite()` 把關**——在**寫入前**擋掉，不要寫入後補救（補救不了）。

已被汙染的元素要救回來，**必須清掉快取再重建，單純寫入正確值無效**——而且 `clearProps`
之後要把原本的基準 transform 重新套回去，只 clear 不重建等於把元素丟在未定位的狀態：

```js
gsap.set(cards, { clearProps: 'all' })
gsap.set(cards, { xPercent: -50, yPercent: -50 })   // ← 這行不能省
```

實作見 `src/components/HeroProductRing.vue` 的 `layout()` / `fromProxy()` /
`recover()` / `autoAdvance()`。

## ⚠️ 觸控會送 `mouseenter`，但常常不送 `mouseleave`

hover 造成的狀態（暫停自動輪播、暫停漂浮）在觸控裝置上會**卡在「進入」那一側**
——`hovering` 永遠是 `true`，自動播放再也不會恢復。

解法是只在真的有 hover 指標的裝置上理會 hover：

```js
const canHover = window.matchMedia('(hover: hover)').matches
```

見 `HeroProductRing.vue` 的 `onCardEnter` / `onCardLeave`。

## ⚠️ IntersectionObserver 快速捲動會一次送多筆 entry

只讀 `entries[0]` 會拿到**過期的那一筆**，元素於是卡在錯的分支（例如捲回畫面內了卻
仍停在「離開視窗」的暫停狀態，而且不會自癒）。一律取最後一筆：

```js
const entry = entries[entries.length - 1]
```

見 `HeroProductRing.vue` 的 IntersectionObserver 與 `src/directives/reveal.js`。

## 路由導航

- 宣告式：`<router-link :to="...">`
- 程式式：`router.push()` / `router.replace()`
- 篩選走 query：`{ path: '/products', query: { category: slug } }`

<!-- 自 docs/gotchas.md 移入（2026-09-10），該檔已解散 -->

## 送出流程:await 前後讀同一個 reactive 來源

**這個坑在同一條分支上被抓到三次**(2026-09,`OrderDetail` 匯款回報、`OrderForm`
送單、`Account` 儲存),形狀完全一樣,所以值得記下來。

**症狀**

送出期間客人改了輸入框,結果「畫面說的」和「真的送出去的」對不上:

- `OrderDetail.reportPayment()` — 送出 `12345`,等待中改成 `54321`,Directus 回
  204(SDK 拿到 `null`)走 fallback 又讀一次 `paymentNote.value` → 顯示
  「已收到…54321」並收起表單,實際寫進去的是 `12345`。**店家會拿舊末五碼對帳。**
- `OrderForm.submit()` — `canSubmit` 只在點下去那一刻成立,但重抓會員資料隔著一段
  `await`,等待中清空電話就會把空字串送到 service 轉成 `contact_phone: null`。
- `Account.handleSave()` — 送的是 `{ ...form }` 快照(這步是對的),但欄位沒鎖,
  等待中打的字不進這次請求,成功後表單直接收起 → **鍵盤輸入無聲消失**。

**根因**

`ref` / `reactive` 讀的永遠是「當下」。`await` 把「檢查」「送出」「回填」拆成三個
不同的時間點,而使用者在那段空窗裡是可以動的。原生 `required` / `pattern` 也救不了
——這些輸入框多半不在真正提交的 `<form>` 裡,或按鈕是 `type="button"` 搭 `@click`。

**對策**(兩件事都要做,少一件都不夠)

1. **`await` 之前先定住值**,請求與其後的驗證、回填、錯誤訊息一律只用這份快照。
   一次把整組欄位快照起來,不要一半快照一半即時——那種不一致讀起來像有特殊理由。

   ```js
   const payload = { contactPhone: form.contactPhone.trim(), /* … */ }
   if (!payload.contactPhone) { /* 報錯 */ return }
   const result = await orderStore.submit(payload)
   ```

2. **送出期間鎖住輸入**。值已經定住了,畫面就不該再暗示「還改得動」。多個欄位用
   `<fieldset :disabled="saving">` 一次蓋住,比逐個掛 `:disabled` 少一輪漏改的機會
   (記得 `border-0 p-0 min-w-0`,fieldset 的預設樣式會弄壞版面)。

`v-model.trim` 只作用在使用者輸入。程式碼直接指派的預填值(如
`form.contactPhone = c.phone || ''`)**不會被 trim**,所以閘門自己也要 `.trim()`。
