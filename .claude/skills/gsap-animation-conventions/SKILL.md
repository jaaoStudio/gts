---
name: gsap-animation-conventions
description: 本專案 GSAP 動畫踩過的雷與驗證方法。動 HeroProductRing、v-reveal 或任何 GSAP transform／Draggable 時使用；也涵蓋 headless 截圖驗證動畫的正確做法。
---

# GSAP 動畫：本專案的雷與驗證方法

> GSAP **API 用法**請用全域 plugin `gsap-skills`（`gsap-core`、`gsap-scrolltrigger`、
> `gsap-plugins` …）。這份只記**本專案實際踩過**、官方文件不會寫的東西。

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

## ⚠️ 用 headless Chrome 截圖驗證動畫：不要用 `--virtual-time-budget`

**它會讓 GSAP 停在動畫起始格。** 用它截 GTS 首頁時，hero 標題與整塊 copy 全是空白
（`.hero-el` 停在 `opacity: 0`、SplitText 的行停在遮罩外），看起來像「動畫把內容弄不見了」
的重大 bug——**實際上人眼在真瀏覽器看完全正常**。

原因：虛擬時間不會照實推進 GSAP 的 ticker，截到的是第一格而不是最終態。

正確做法：用 `--remote-debugging-port` + CDP，navigate 之後**真的 sleep 幾秒**，
再 `Page.captureScreenshot` 與 `Runtime.evaluate`。

> **看到「元素完全不見」先懷疑量測方法，不要急著改程式。**
> 另一個更快的裁決：直接請使用者自己看一眼。

Vite dev server 是 **HTTPS**（self-signed）：`curl` 要 `-k`，Chrome 要
`--ignore-certificate-errors`，用 `http://` 連會直接失敗。

## 相關

- `.claude/skills/mobile-debugging` — 手機專屬的動畫問題怎麼量（NaN 那個 bug 就是這樣抓到的）
- `.claude/skills/vue-component-conventions` — 進場動畫的分工（`v-reveal` vs GSAP）
- `docs/adr/0002-premium-industrial-設計系統.md` — reduced-motion 的約束
