---
name: Routing & Authentication
description: 路由定義、導航守衛，以及 Google SSO(session 模式)登入流程。處理路由、登入/權限、auth store 或 SSO callback 時使用。
---

# Routing & Authentication Conventions

> ⚠️ **認證是 session cookie 模式，前端不持有 access token。**
> 任何「把 token 存進 localStorage / `directus.setToken()` / 手動打 `/auth/refresh`」的寫法
> 都是**舊架構的殘留，不可再用**。詳見下方〈認證模式〉。

## 認證模式：httpOnly session cookie

`src/utils/directus.js` 的 SDK 實體：

```js
createDirectus(apiUrl)
  .with(authentication('session', { credentials: 'include', autoRefresh: true }))
  .with(rest({ credentials: 'include', onRequest: (o) => ({ ...o, cache: 'no-cache' }) }))
```

- credential 是 Directus 種的 **httpOnly session cookie**，瀏覽器自動夾帶，
  access token **完全不進 JS / localStorage**（防 XSS 竊 token）。
- 因此**登入狀態的唯一判準是「抓不抓得到 user」**：
  `isAuthenticated: (state) => !!state.user`。沒有 token 可以檢查。
- `rest()` 的 `cache: 'no-cache'`：Directus 讀取回應帶 `Cache-Control: private, max-age=300`，
  不加會讓「存檔後重整仍看到舊資料」。改動此處請保留。

搭配的後端約束（Directus 在德國 VM，不在本 repo）：
`AUTH_GOOGLE_MODE=session`、CORS 允許本站 origin 且 `credentials=true`、
`SESSION_COOKIE_SECURE=true`、`SESSION_COOKIE_SAMESITE=Lax`
（正式站前端走 Traefik `/api` 反代與 Directus 同源；勿用 `None`，會開啟 CSRF 面向）。

## 路由表（`src/router/index.js`）

| Path | Name | 載入 | meta |
|---|---|---|---|
| `/:pathMatch(.*)*` | — | — | catch-all → redirect `/` |
| `/` | Home | Eager | title |
| `/products` | Products | Eager | title |
| `/product/:slug` | ProductDetail | Eager | title（載入後以商品名覆蓋）|
| `/contact` | Contact | Lazy | title |
| `/faq` | Faq | Lazy | title |
| `/shipping` | Shipping | Lazy | title |
| `/warranty` | Warranty | Lazy | title |
| `/privacy` | Privacy | Lazy | title |
| `/terms` | Terms | Lazy | title |
| `/login` | Login | Lazy | title（元件是 `AdminLogin.vue`）|
| `/admin/callback` | AdminCallback | Lazy | — |
| `/account` | Account | Lazy | `requiresAuth` |
| `/order` | OrderForm | Lazy | title（**刻意不設 `requiresAuth`**，見下）|
| `/order/done/:id` | OrderDone | Lazy | `requiresAuth` |
| `/account/orders` | OrderHistory | Lazy | `requiresAuth` |
| `/account/orders/:id` | OrderDetail | Lazy | `requiresAuth` |

**`/order` 為何不設 `requiresAuth`**：購物車存在 localStorage，未登入也該看得到自己挑了什麼。
該頁在未登入時顯示「登入後送出」，按下去會先把來源頁寫進
`sessionStorage.gts_post_login_redirect`，`AdminCallback` 讀取後導回——
**只接受站內相對路徑**（擋 `//evil.com` 這類 protocol-relative 開放導轉）。

**載入策略**：核心店面三頁（`/`、`/products`、`/product/:slug`）靜態 import；
其餘一律 `() => import(...)`。

**頁面標題**：走 `meta.title` + `router.afterEach` 套用，不要在各元件自己設
（`ProductDetail` 是唯一例外，載入商品後覆蓋為商品名）。新增路由請一併給 `meta.title`，
格式 `<頁名>｜金同心實業`。

## 導航守衛

```js
router.beforeEach(async (to) => {
    if (to.meta.requiresAuth) {
        const { useAuthStore } = await import('../stores/auth')   // 動態 import 避免循環相依
        const authStore = useAuthStore()

        // ⚠️ 這一行不能拿掉,見下方「守衛競態」
        await authStore.init()

        if (!authStore.isAuthenticated) return '/login'
    }
})
```

**只有 `requiresAuth`，沒有 `requiresAdmin`。** 前台已經沒有管理員概念——
`isAdmin` / `accountRoute` / `/admin` 路由都在 2026-09 移除，原因見下方
〈Directus 11：role 已經沒有 `admin_access`〉：那個判斷恆為 false，
所以 `/admin` 對所有人不可達，而沒人抱怨是因為那頁只有 placeholder。

### ⚠️ 守衛競態：受保護頁面「直接輸入網址」會被吞掉

`main.js` 的 `app.use(router)` 會**立刻**觸發首次導航，而 `authStore.init()` 是在那之後
才 await，所以守衛看到的 `isAuthenticated` 一律是 `false`。後果是：

```
使用者輸入 /account/orders
  → 守衛判定未登入 → /login
    → AdminLogin 此時 init 已完成、看到已登入 → replace 到 accountRoute
      → 使用者莫名其妙停在 /account
```

**`/account` 本身之所以看起來正常，純粹是繞一圈剛好回到同一頁**——在只有 `/account`
一個非管理員保護路由的年代不會被發現，加了 `/account/orders` 才現形（2026-09-04 修）。

解法就是守衛內先 `await authStore.init()`。`init()` 有 `initialized` 旗標、冪等，
再呼叫一次不會重打 API。

> 這也是為什麼守衛**仍然不該做業務性的 fetch**：它只補等這一個必要的初始化，
> 其餘資料一律留給元件自己抓。

## 初始化：Init Before Mount

`src/main.js` 在 `app.mount()` **之前**完成 `authStore.init()`：

```js
authStore.init().then(() => {
    app.mount('#app')
})
```

`init()` 只做一件事：`fetchCurrentUser({ force: true })` —— cookie 由瀏覽器夾帶，
抓得到 user 即已登入，抓不到即匿名（`fetchCurrentUser` 會靜默吞掉 401/403，這是正常路徑不噴錯）。
`initialized` 旗標保證冪等。

### 禁止事項 ❌

1. **不要在 `App.vue` 的 `onMounted` 初始化** — fire-and-forget，守衛執行時狀態可能還沒回來。
2. **不要在守衛內做首次認證抓取** — 會造成狀態競態與潛在無窮迴圈。
3. **不要在元件裡再呼叫 `authStore.init()`** — `main.js` 已呼叫過。
   （曾在 Navbar 多呼叫一次造成重複請求，見 `13b96bc`。）
4. **不要用 Promise 去重（`_initPromise`）等過度設計** — 架構正確就不需要；
   `initialized` 布林旗標已足夠。

## Google SSO 流程

```
使用者點登入
     │  authStore.getGoogleLoginUrl()
     ▼  ${VITE_DIRECTUS_PUBLIC_URL}/auth/login/google?redirect=<origin>/admin/callback
Cloudflare Worker 攔截 /auth/login/google/callback → double-tap（見 ADR 0001）
     │  第一擊：邊緣立刻回 spinner，導向同一組參數 + 尾端 &_edge=1
     │  第二擊：切掉旗標，fetch 給德國的 Directus
     ▼
Google 同意畫面 → Directus 換 token、寫 session、302 回 /admin/callback
     │  （session cookie 此時已種好）
     ▼
AdminCallback.vue → authStore.handleCallback()
     │  └─ fetchCurrentUser({ force: true })：抓得到 user 就代表 session 有效
     ▼  ※ 不需要、也不可以打 /auth/refresh 或 setToken
導向 /account（前台已無管理員概念，見〈導航守衛〉）
```

### Gotchas

- **Redirect 白名單**：Directus 的 `AUTH_GOOGLE_REDIRECT_ALLOW_LIST` 必須逐一列出
  每個前端 origin 的 `/admin/callback`（正式站 + 各 dev 網域）。少了會在登入第一步被擋，
  回 `INVALID_PAYLOAD: URL ... can't be used to redirect after login`。**最常踩的坑。**
- **本機 dev 需 https + 自訂網域**：`vite.config.js` 的 `mkcert({ hosts: [...] })` 必須包含
  實際進站網域（如 `local.gtxin.com.tw`），否則憑證不涵蓋、直接 `CERT_COMMON_NAME_INVALID`。
  該網域也要放進上面的白名單。
- **改 double-tap 要動 Worker**：callback 路徑或 double-tap 行為調整時，
  Worker（`worker/auth-callback-worker.js`）與前端必須一起改。
  送到 Directus 的 `code`/`state` **一個 byte 都不能改**（勿用 `URLSearchParams` 重新序列化）。
- **要優化先看 Worker log**：第二擊會 `console.log` 一筆 `sso_callback_upstream`
  （含 `ms`/`status`/`colo`/`ua`）。這是判斷還值不值得優化的唯一依據，不要憑感覺調。

## 帳號登不進去：先查 `status` 與 `provider`，不要從程式碼找

2026-09-07 為此繞了很多輪。這兩欄在 `directus_users`，**兩欄要一起看**，因為
provider 的檢查排在 status 之前、會蓋掉 status 的錯誤訊息。

> ⚠️ 查詢一律加 `-w '[HTTP %{http_code}]'`：壞 token 的 401 在 `curl -s` 下看起來像
> 空回應，**極易誤判成「查無此人」**。
> 該用哪把 token、它讀得到什麼，見 `.claude/skills/directus-schema-fetcher`（那支擁有 `.env`）。

### `status` 必須是 `active`

非 active（`invited` / `suspended` / `draft`）時：

- 密碼正確也登不進去——Directus 在**驗密碼之前**就擋掉
- 「忘記密碼」**靜默不寄信**，畫面卻照樣顯示已寄出（防 email 列舉）

第二點是好用的診斷手法：**去 Resend 看有沒有寄出紀錄**。查無該收件人＝Directus
根本沒發請求＝`status` 不對。

### `provider` 綁定登入方式，email 不是鍵

後台手動建的帳號是 `default`（只認密碼），SSO 建的是 `google`（只認 Google）。
email 一樣也不通，zh-TW 訊息是「此使用者屬於其他服務」（`INVALID_PROVIDER`）。
這是刻意的安全設計，避免有人拿 OAuth 授權接管同 email 的密碼帳號。

前台 storefront 只有 Google 入口（`AdminLogin.vue` 無密碼表單），所以
**`provider = 'default'` 的帳號前台一定進不去**，只能進後台。

### 改成 Google 登入的正確做法（已實測）

兩欄要同時設，缺一不可：

```json
{"provider": "google", "external_identifier": "<該帳號的 email>"}
```

**這座 Directus 用 email 當識別鍵，不是 Google 的 `sub`**——不必去撈 OAuth 回應裡的 sub，
照抄一筆已知可登入的記錄即可。改完密碼登入會失效（provider 單選），
退回就是 `{"provider":"default","external_identifier":null}`。

> 驗證方式：先拿一個自己控制得到的 Google 帳號改改看、實際登入過，確認可行再套到目標帳號。

## 角色與導向

| 角色 | 登入後導向 | 可存取 |
|---|---|---|
| 已登入（不分角色） | `/account` | 除公開頁外的 `requiresAuth` 頁面 |
| 訪客 | `/login` | 公開頁 |

**前台不區分管理員**——老闆用 Directus 後台處理訂單，不走這個站。
⚠️ 不要重新加入基於 `role.admin_access` 的判斷，理由見下節。

## 新增路由步驟

1. 建 `src/views/NewPage.vue`
2. 加進 `src/router/index.js` 的 `routes`
3. 除核心店面頁外一律 lazy-load
4. 給 `meta.title`（格式 `<頁名>｜金同心實業`）
5. 需登入加 `meta: { requiresAuth: true }`；限管理員再加 `requiresAdmin: true`

<!-- 自 docs/gotchas.md 移入（2026-09-10），該檔已解散 -->

## Directus 11:role 已經沒有 `admin_access`,別再從 role 判斷管理員

**症狀**:`user.role.admin_access` 恆為 `undefined`,任何 `=== true` 的判斷永遠是
false。程式碼看起來完全合理,沒有錯誤訊息,只是那條路線對所有人都不通。

前台曾有 `isAdmin` / `accountRoute` / `/admin` 路由靠這個欄位判斷,結果 `/admin`
對所有人不可達(2026-09 發現)。沒人察覺是因為那頁只顯示「功能即將上線」——
**權限判斷寫錯而沒有任何人抱怨,是因為錯誤的那一側剛好什麼都沒有**。

**成因**:Directus 11 把 `admin_access` / `app_access` 從 `directus_roles` 搬到
`directus_policies`,role 改以 `policies` 關聯過去。實際欄位:

```
directus_roles     children description icon id name parent policies users …
directus_policies  admin_access app_access name permissions roles users …
```

`readMe({ fields: ['*', 'role.*'] })` 因此永遠拿不到 `admin_access`。

**要在客戶端判斷的話**,可用的欄位路徑是(兩條都有效,使用者可直接掛 policy,
也可經由 role 繼承):

```
policies.policy.admin_access
role.policies.policy.admin_access
```

⚠️ **但不要把它加進 `readMe()` 的預設 fields**。`customer access` policy 對系統
collection 只開放 `directus_files` / `directus_users` / `directus_roles`,**沒有
`directus_policies`**;夾帶進去會讓整個 `readMe` 403,也就是**所有客戶都登不進去**
(與 `settingsService.getSettings()` 的 403 陷阱同型)。真要做就另發一個請求、
catch 掉失敗當作非管理員,並且只在需要的路由上呼叫。
