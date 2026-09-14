---
status: accepted
---

# GA4 分析：不記錄任何金額，consent 自管三態

## Decision

前台接 **GA4**（`vue-gtag`，`initMode: 'manual'`），送三個事件：

| 事件 | 觸發點 |
|---|---|
| `view_item` | `ProductDetail.vue` 的 `fetchProduct()` 取得商品後 |
| `add_to_cart` | order store 的 `add()` 末尾 |
| `generate_lead` | `OrderForm.vue` 的 `submit()`，`if (!result) return` 之後 |

三個事件**一律不帶 `price` / `value` / `currency`**，`page_view` 排除 `/account/*`
與 `/order/done/*`。

Cookie consent 採 **opt-in**：同意之前完全不載入 gtag script。
「使用者的選擇」由 `src/utils/analytics.js` 以 localStorage 存**三態**
（`null` 沒問過 / `granted` / `denied`）。啟用走 `addGtag()`、撤回走 `optOut()`
加自行清除 cookie；**完全不使用 `useConsent()` composable**（理由見下）。
兩個動作都不重載頁面。

## Context

### 為什麼 GA 裡一個金額都沒有

送出訂購單的當下，系統只有 **Reference subtotal（參考小計）**，那是估算值；
真正的 **Amount due（應付金額）** 是 Admin 事後在 Directus 確認的，瀏覽器不在場。
把參考小計當 `value` 送，GA4 會把它當成「收益」顯示——你會得到一個**永遠不等於實際
營收**的數字，而且它會跟 ADR 0004 的對帳規則打架。寧可報表沒有金額欄，也不要一個
會誤導對帳的假數字。

GA4 的 `purchase` 事件同理不適用：它要求當場就有 `transaction_id` 與成交金額。
`generate_lead` 才是詢價（Quote-on-request）的對應事件。

### 為什麼 consent 不直接用 vue-gtag 的 `useConsent().hasConsent`

它的實作是 `document.cookie.includes("_ga")`，而 `rejectAll()` 會主動刪掉 `_ga`：

```js
const hasConsent = computed(() => document.cookie.includes("_ga"))
const rejectAll = async () => {
  consentDeniedAll("update")
  await removeCookies("_ga", cookieDomain.value)   // ← 刪掉判斷依據
  window.location.reload()
}
```

於是「**拒絕過**」和「**還沒問過**」都是「沒有 `_ga`」，banner 無法區分，**拒絕的人
每次進站都會被重新詢問**。同樣的原因，同意後若 `_ga` 被廣告封鎖器擋掉，也會一直跳
banner。這不是 bug，是 cookie 這個載體裝不下三態。

更關鍵的是實測才發現的副作用：**光是呼叫 `useConsent()` 就會載入 GA**。它結尾有
`if (hasConsent.value) addGtag()`，而 `hasConsent` 是 `includes("_ga")` 這種**子字串
比對**——本網域底下任何殘留的 `_ga*` 都會讓它誤判成「使用者已同意」。驗證時
localhost 上其他專案留下的 `_ga` 就讓 GA 在 banner 還顯示著的當下被載入、並種下
`_ga_TEST123`。正式站同樣會中：只要 `gtxin.com.tw` 底下曾有 `_ga*` 殘留
（例如先前同意過、後來想撤回）。

所以整個 composable 都不碰，改為直接呼叫 `addGtag()`，撤回同意時清 cookie 的部分
自己實作（`clearGaCookies()`）。

### 為什麼照歐盟標準做

EDPB 的 Cookie Banner Taskforce 報告要求：只要任一層有「接受」，同層就必須有
「拒絕」，且拒絕不能只是連結。依 EDPB Guidelines 3/2018 的 targeting test，本站
（繁體中文、TWD、台灣物流、統編欄位）**不構成向歐盟提供服務**，GDPR 其實不適用；
但為了日後真的接歐盟單時不必重做，決定現在就照該標準實作。

⚠️ 但要清楚：**banner 不等於 GDPR 合規**。真要接歐盟生意，另需合法性基礎、資料主體
權利流程、與 Google 的資料處理協議、跨境傳輸機制與政策條款——屆時要整套重審。

## Considered options

- **Google Tag Manager**：只裝一個 tag 吃不到它「不改 code 就能加 tag」的好處，卻要付
  多一跳載入、除錯變兩層、被封鎖器擋得更兇的代價。**不是鎖死的決定**——日後要改用
  GTM，就是把 gtag 拿掉、貼上容器、在 GTM 裡建 GA4 tag。
- **`generate_lead` 帶 `items`**：GA4 只有電商事件（`add_to_cart`、`purchase` 等）會解析
  `items`，`generate_lead` 不在清單內；帶了只能在 BigQuery export 看到，商品報表不會用。
  改成送真正的 `view_item` / `add_to_cart`，商品層級資料才進得了標準報表。
- **只改隱私權政策、不做 banner**：台灣個資法的告知義務到此即滿足，也是多數台灣網站的
  做法。被否決的理由是上面那條「日後不必重做」。
- **靠「到達 `/order/done`」算轉換**：會漏掉輪詢逾時那條分支（訂單一樣已建立，卻導向
  `OrderHistory`），而且該路徑已被排除追蹤。

## Consequences / gotchas

- ⚠️ **GA4 後台「加強型評估」的「網頁瀏覽」必須關閉**。它會靠 History Change 自己抓 SPA
  換頁，與 `pageTracker` 疊起來每次換頁算兩次。那個開關不在本 repo 裡，CI 綠燈不構成證據。
  （`vue-gtag` 那一側不必擔心：啟用 `pageTracker` 時它會自動把 config 設成
  `send_page_view: false`，實測首頁的 dataLayer 只有一筆 `page_view`。雙重計算的風險
  只剩後台那個開關。）
- **撤回同意必須 `optOut()`，不能只清 cookie**。`pageTracker` 的 `afterEach` 由 vue-gtag
  自己註冊，不經過 `analytics.js` 的 consent 守衛——先接受、後從頁尾撤回時，它照樣會在
  下次換頁送出 page_view，gtag 也會立刻把 `_ga` 種回來，撤回等於沒發生。
- **`addGtag()` 每呼叫一次就多註冊一組 `router.afterEach`**，所以啟用必須是冪等的
  （`analytics.js` 的 `started` 旗標）。否則「接受 → 拒絕 → 再接受」之後，每次換頁都會
  送出兩筆 page_view。
- **兩個按鈕都不重載頁面**。`addGtag()` 內部是 `await router.isReady()` →
  `trackRoute(currentRoute)` → 註冊 `afterEach`，當前這頁它自己會追蹤，不必靠重載補。
  重載反而會清空 `OrderForm` 那個沒有持久化的 `reactive` 表單。
- **商品頁的 `page_title` 是通用的「商品｜金同心實業」**，不是商品名。`router/index.js`
  的 `afterEach` 先套 `meta.title`，而 `ProductDetail.vue` 要等 API 回來才覆蓋成商品名，
  那時 page_view 早已送出。`page_path` 仍能區分各商品，且 `view_item` 帶的 `item_name`
  是正確商品名、商品報表不受影響——已知取捨，刻意不修。
- **`generate_lead` 的品項數必須在 `orderStore.submit()` 之前抓**——`submit()` 成功後會
  `clear()`，之後再讀全是 0。
- **`VITE_GA_ID` 沒傳 build arg 就整個不載入，且不會有任何錯誤訊息**。它直接寫在
  `deploy.yml` 的 build-args 而非 GitHub secret：GA 評估 ID 本來就在前端明碼可見、不是機密，
  走 secret 只會多一個「忘了設 → 正式站靜默沒有 GA」的失敗點。
  Dockerfile 在 `npm run build` 之後加了一道 grep：有傳這個 arg 就必須出現在 `dist/assets`，
  否則 build 失敗。連帶擋住「有人把 `main.js` 的 `if (import.meta.env.VITE_GA_ID)` 改成恆假」。
- **GA4 後台還有兩個 repo 外的設定會靜默影響資料**：
  **資料保留期間**預設只有 2 個月（且調整不追溯，過期資料救不回來），已改為 14 個月；
  **Google Signals 維持關閉**——開啟會讓資料流入 Google 的廣告個人化，而 `Privacy.vue`
  第五節的揭露只涵蓋「分析網站流量」，要開就得先改那段。
- **排除規則不可順手把 `/product/:slug` 也正規化**——商品熱度正是靠實際 slug 分辨的。
