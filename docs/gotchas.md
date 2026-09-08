# Gotchas

踩過並修掉的陷阱。這裡只記「靜態讀碼看不出來、下次還會再踩」的那種,
避免同一個坑重挖第二次。

## GSAP:NaN 寫進 transform 會讓元素永久凍結

**症狀**（2026-07,`HeroProductRing.vue` 首頁 3D 轉盤,僅 iOS 可復現）

轉盤拖到一半突然「卡在原地」——卡片不再跟著手指移動,但仍在上下漂浮,
透明度也還會變化。一旦發生就**不會自己恢復**,只能重新整理。

**根因**

快速連續觸控時,GSAP Draggable + InertiaPlugin 在 throw 進行中會讓
`gsap.getProperty(proxy, 'x')` 回傳 `NaN`。該值往下傳成 `rotation`,
`layout()` 便算出 `NaN` 並寫出 `translate(NaNpx, NaNpx)` 這種無效 CSS。

關鍵在後半段:

1. 瀏覽器**整條 `transform` 拒收**,保留最後一次有效值。
2. GSAP 內部快取同時被 `NaN` 汙染,**之後每一次有效寫入也一併失效**。

所以即使 `rotation` 在 0.3 秒後就恢復正常(log 顯示後續一路正常運作超過一分鐘),
畫面依然永遠停在凍結的那一格。

**為什麼容易誤判**

這組症狀非常會騙人,當時連續猜錯四個方向(blur 效能、iOS `touch-action`
方向消歧、Draggable 失同步、記憶體壓力):

- `opacity` 不走 transform,所以**還會正常變化** → 看起來像「只剩透明度在動」
- 漂浮動畫掛在內層 `.card-bob`,**不受影響** → 看起來像「動畫還活著」
- GSAP 內部值(`gsap.getProperty`)一切正常 → 從 JS 端量根本看不出問題

唯一能定案的是**同時比對三個值**:GSAP 內部值、`el.style.transform`（inline）、
`getComputedStyle(el).transform`（computed）。當內部值持續變化而後兩者凍結時,
問題就確定在「寫入 DOM」這一哩,而非計算。

**對策**

任何要餵進 `gsap.set()` 的計算值,若源頭來自 Draggable / `getProperty`,
一律在**寫入前**用 `Number.isFinite()` 把關,而不是寫入後補救:

```js
function layout() {
  if (!cards.length || !Number.isFinite(rotation)) return
  // …gsap.set()
}
```

已被汙染的元素要救回來,必須清掉 GSAP 快取再重建,單純寫入正確值無效:

```js
gsap.set(cards, { clearProps: 'all' })
gsap.set(cards, { xPercent: -50, yPercent: -50 })
```

實作見 `src/components/HeroProductRing.vue` 的 `layout()` / `fromProxy()` /
`recover()` / `autoAdvance()`。

## iOS:觸控會送 `mouseenter`,但常常不送 `mouseleave`

同一個元件踩到的第二個坑。用 `@mouseenter` 設旗標、`@mouseleave` 清旗標的寫法,
在 iOS 上點一下卡片就會讓旗標**永久卡在 true**,連帶讓自動輪播再也不啟動。

對策:只在真的有 hover 指標的裝置上處理 hover。

```js
const canHover = window.matchMedia('(hover: hover)').matches
```

## IntersectionObserver:快速捲動會一次送多筆 entry

callback 收到的是**陣列**。用 `([entry]) => …` 解構只讀第一筆,快速滑動時會讀到
過期狀態(例如已經回到畫面了卻停在「離屏」分支)。要讀最後一筆:

```js
const entry = entries[entries.length - 1]
```

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

## 除錯:手機才能復現的問題不要靠猜

沒有裝置 console 可看時,加一個 dev-only 的 Vite middleware 把狀態寫進檔案,
比反覆推測快得多:

- `vite.config.js` 加 `apply: 'serve'` 的 plugin,用
  `server.middlewares.use('/__log', …)` 接收 POST
- **務必 `appendFileSync` 寫進檔案**。只用 `console.log` 在背景執行的 dev server
  會被 stdout 緩衝吃掉
- 前端用 `navigator.sendBeacon('/__log', …)` 回報,高頻事件記得節流
- 回報欄位要能**互斥地區分假設**（如上面那組內部值 / inline / computed）
- 查完把 plugin 與所有回報程式碼移除再 commit
