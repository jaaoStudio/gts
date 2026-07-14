---
status: accepted
---

# Google SSO 登入流程與 Cloudflare Worker「double-tap」

## Decision

前台採用 **Directus 內建 Google SSO**:前端把使用者導向 `${VITE_DIRECTUS_PUBLIC_URL}/auth/login/google?redirect=<origin>/admin/callback`,Google 認證後 Directus 種下 refresh cookie 並把瀏覽器導回前台的 `/admin/callback`;前台在該頁打 `POST /auth/refresh`(`withCredentials`)把 cookie 換成 access token 存進 `localStorage`,再依 `role.admin_access` 導向 `/admin` 或 `/account`。

Directus 後端部署在**德國** VM,掛在 Cloudflare(`gts-core.jaao.tw`)後面。為了遮住這段跨洲延遲,前面架了一個 **Cloudflare Worker**,攔截 `GET /auth/login/google/callback` 做 **double-tap**:第一次請求(沒有 `edge_loading` cookie)由 Worker 在邊緣**立刻**回一頁輕量 spinner、種下短效 `edge_loading` cookie 並以 `location.replace(同一 URL)` 重打;第二次(帶 cookie)才真正 `fetch` 給德國的 Directus 處理。

## Context

使用者在 Google 選完帳號後,callback 要等德國後端回應。這段空窗期瀏覽器仍停在 Google 頁面、畫面像凍住,使用者容易誤以為網站掛了。真正的問題是**感知延遲(perceived latency)**,不是認證本身壞掉。

Worker 用「先種 cookie、原網址重打一次」把 spinner 塞在中間,讓使用者**馬上**看到載入中。關鍵約束:**URL 參數(OAuth `code`/`state`)一個字都不能改,只靠 `edge_loading` cookie 分辨第一/第二趟**——因為第一趟被 Worker 短路成 spinner、根本沒送到 Directus,那顆一次性 `code` 只會在第二趟被 Directus 消耗一次;若在重打時動到參數,反而會讓 Directus 回 `INVALID_CREDENTIALS`。

## Considered options

- **直接回跳、不放 Worker**:最單純,但使用者會盯著凍住的 Google 頁數秒,以為壞了。被否決。
- **把後端搬近一點 / 加節點**:治本但成本高、非當前可動。暫不採。
- **只在前端 `/admin/callback` 放 spinner**:救不到,因為延遲發生在 Google→Directus 這一跳,SPA 都還沒載入。

## Consequences / gotchas

- **Redirect 白名單**:Directus 的 `AUTH_GOOGLE_REDIRECT_ALLOW_LIST` 必須逐一列出每個前端 origin 的 `/admin/callback`(含正式站與各 dev 網域)。少了就會在登入第一步被擋、回 `INVALID_PAYLOAD: URL ... can't be used to redirect after login`。這是最容易踩到的坑。
- **本機 dev 需 https + 自訂網域**:`vite.config.js` 用 `vite-plugin-mkcert`,`hosts` 必須包含實際進站的網域(如 `local.jaao.tw`),否則憑證不涵蓋該網域、瀏覽器 `CERT_COMMON_NAME_INVALID` 直接進不了站。改 `hosts` 後若憑證沒更新,清 `~/.vite-plugin-mkcert/`(保留 `rootCA*`)強制重簽。dev 進站網域也要一起放進上面的白名單。
- **auth 走 public URL、不走 `/api` proxy**:`VITE_DIRECTUS_PUBLIC_URL` 直連後端;登入跳轉不能走 Vite 的 `/api` proxy(會失去正確 origin/cookie)。
- **Worker 與前端耦合**:callback 路徑、`edge_loading` cookie 名稱與行為若要調整,Worker 與前端得一起改。Worker 內那頁 spinner 的樣式仍是舊深色版,與前台 premium-industrial 設計不一致(純視覺、閃一下,列為待整理)。
