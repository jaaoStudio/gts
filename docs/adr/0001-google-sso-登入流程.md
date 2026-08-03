---
status: accepted
---

# Google SSO 登入流程與 Cloudflare Worker「double-tap」

## Decision

前台採用 **Directus 內建 Google SSO**:前端把使用者導向 `${VITE_DIRECTUS_PUBLIC_URL}/auth/login/google?redirect=<origin>/admin/callback`,Google 認證後 Directus 種下 refresh cookie 並把瀏覽器導回前台的 `/admin/callback`;前台在該頁打 `POST /auth/refresh`(`withCredentials`)把 cookie 換成 access token 存進 `localStorage`,再依 `role.admin_access` 導向 `/admin` 或 `/account`。

> **2026-07-29 更新(機制已變,決策不變)**:認證已改為 **Directus session 模式**(`AUTH_GOOGLE_MODE=session`)。credential 是 httpOnly session cookie,**前端不再持有 access token,也不再打 `/auth/refresh`**——`/admin/callback` 直接 `readMe()`,抓得到 user 即代表 session 有效(`authStore.handleCallback()`)。上段的 `localStorage` 描述僅存為歷史。改動原因:token 不進 JS 可免疫 XSS 竊取。SSO 導向、Worker double-tap、下方所有 gotchas 均不受影響。

Directus 後端部署在**德國** VM,掛在 Cloudflare(`gts-core.jaao.tw`)後面。為了遮住這段跨洲延遲,前面架了一個 **Cloudflare Worker**(原始碼:`worker/auth-callback-worker.js`),攔截 `GET /auth/login/google/callback` 做 **double-tap**:第一次請求(網址尾端沒有 `_edge=1` 旗標)由 Worker 在邊緣**立刻**回一頁輕量 spinner,並把瀏覽器導向「同一組 OAuth 參數 + 尾端附加 `&_edge=1`」;第二次(帶旗標)Worker 用字串把旗標切掉、再 `fetch` 給德國的 Directus 處理。

## Context

使用者在 Google 選完帳號後,callback 要等德國後端回應。這段空窗期瀏覽器仍停在 Google 頁面、畫面像凍住,使用者容易誤以為網站掛了。真正的問題是**感知延遲(perceived latency)**,不是認證本身壞掉。

Worker 用「先回 spinner、再重打一次」把載入畫面塞在中間,讓使用者**馬上**看到進度。關鍵約束:**送到 Directus 的 `code`/`state` 一個 byte 都不能改**——第一趟被 Worker 短路成 spinner、根本沒送到 Directus,那顆一次性 `code` 只會在第二趟被 Directus 消耗一次;若動到參數,Directus 會回 `INVALID_CREDENTIALS`。所以旗標只用**純字串**接在網址最尾端、也只用純字串切掉,全程不碰 `URLSearchParams`(它會重新序列化整串 query,可能改動 `state` 裡 `%2F`/`%2B`/`%3D` 的編碼)。

## Considered options

- **直接回跳、不放 Worker**:最單純,但使用者會盯著凍住的 Google 頁數秒,以為壞了。被否決。
- **把後端搬近一點 / 加節點**:治本但成本高、非當前可動。暫不採。**2026-07 實測後確認投報率低**:從台灣量 `gts-core.jaao.tw`,`/server/ping`(純記憶體)、`/auth/login/google`、`/items/products`(碰 DB)的 TTFB 全部落在 390–440ms,碰 DB 與不碰 DB 幾乎沒差 → 後端與 DB 都健康,跨洲往返基準就是約 390ms。距離只值這 390ms,搬遷省不到使用者真正感受到的那一秒。
- **Worker 改 streaming(單次往返:先 flush spinner,背景 fetch 後端,尾端注入跳轉)**:不可行。HTTP headers 一旦送出就無法再補 `Set-Cookie`,Directus 的 session cookie 會遺失,登入必敗。
- **第一擊回 302 而非 HTML**(比 meta refresh 快):不可行。302 期間畫面仍停在 Google,spinner 根本不會出現,等於沒做。
- **讓 Google 直接 callback 到前端網域**(等待就發生在自家 spinner 頁,可完全移除 Worker):Directus 內建 SSO 把 `redirect_uri` 綁死在自己的 `/auth/login/google/callback`,也沒有「接收前端轉送 code」的 API。要做得自行實作整套 OAuth,工程量遠大於收益。
- **只在前端 `/admin/callback` 放 spinner**:救不到,因為延遲發生在 Google→Directus 這一跳,SPA 都還沒載入。

## Consequences / gotchas

- **Redirect 白名單**:Directus 的 `AUTH_GOOGLE_REDIRECT_ALLOW_LIST` 必須逐一列出每個前端 origin 的 `/admin/callback`(含正式站與各 dev 網域)。少了就會在登入第一步被擋、回 `INVALID_PAYLOAD: URL ... can't be used to redirect after login`。這是最容易踩到的坑。
- **本機 dev 需 https + 自訂網域**:`vite.config.js` 用 `vite-plugin-mkcert`,`hosts` 必須包含實際進站的網域(如 `local.jaao.tw`),否則憑證不涵蓋該網域、瀏覽器 `CERT_COMMON_NAME_INVALID` 直接進不了站。改 `hosts` 後若憑證沒更新,清 `~/.vite-plugin-mkcert/`(保留 `rootCA*`)強制重簽。dev 進站網域也要一起放進上面的白名單。
- **auth 走 public URL、不走 `/api` proxy**:`VITE_DIRECTUS_PUBLIC_URL` 直連後端;登入跳轉不能走 Vite 的 `/api` proxy(會失去正確 origin/cookie)。
- **Worker 與前端耦合**:callback 路徑與 double-tap 行為若要調整,Worker 與前端得一起改。Worker 內那頁 spinner 的樣式仍是舊深色版,與前台 premium-industrial 設計不一致(純視覺、閃一下,列為待整理)。
- **狀態不要放回 cookie(iOS 血淚)**:初版用短效 `edge_loading` cookie 分辨第一/第二趟,並以 `location.replace(window.location.href)` 重打。桌面正常,但 **iOS 一律卡在 spinner 頁**,原因有二:(1) 目標網址與當前頁**完全相同**,WebKit 視為重導迴圈,在沒有使用者手勢時直接取消 navigation,第二擊根本沒發出;(2) cookie 只活 10 秒,行動網路下常在第二擊前就過期,於是又被判成第一趟 → 無限迴圈。改用 URL 旗標後兩個問題一起消失(網址不再與自己相同,也不再依賴瀏覽器願不願意存 cookie)。
- **spinner 頁的跳轉要三層備援**:`<meta http-equiv="refresh">`(走 HTML parser,不受 WebKit 對 script navigation 的節流影響,iOS 上最穩)→ `load` 事件後的 `location.replace` → 3 秒後浮出的「繼續登入」連結(帶使用者手勢,任何節流都擋不住)。
- **握手比距離貴**:實測冷連線(含 DNS+TCP+TLS)TTFB 1160ms、暖連線 390ms——光握手就約 780ms,比整趟跨洲往返還貴。所以 `index.html` 對 `gts-core.jaao.tw` 放了 `<link rel="preconnect" crossorigin>`(auth 走 credentials,**少了 `crossorigin` 會另開一條 anonymous 連線,等於白暖**)。這也意味著 double-tap 的實際額外成本只有約 400ms 而非 1.1 秒:第一擊付掉冷握手,第二擊是暖的。
- **要再優化前先看 Worker 的 log**:Worker 第二擊會 `console.log` 一筆 `sso_callback_upstream`(含 `ms`/`status`/`colo`/`ua`),涵蓋「邊緣→Directus→Google 換 token 與 userinfo→寫 session→回 302」全程。在 Cloudflare Workers Logs 或 `wrangler tail` 看得到。**這是判斷還值不值得優化的唯一依據,不要憑感覺調。**
- **HTML escape 別漏**:OAuth 網址含 `&`,寫進 `<meta refresh>` / `href` 前必須 escape 成 `&amp;`,否則 HTML parser 會把 `&state=` 之類當成 entity 解析,參數就毀了。
