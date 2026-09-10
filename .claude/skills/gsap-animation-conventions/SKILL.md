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

需要復原被汙染的元素時：

```js
gsap.set(el, { clearProps: 'all' })   // 清掉被汙染的快取，再重建
```

實作範例見 `src/components/HeroProductRing.vue` 的 `layout()`（`Number.isFinite(rotation)`
的守衛）與 `recover()`。

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
