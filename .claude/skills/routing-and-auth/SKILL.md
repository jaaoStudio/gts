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
| `/admin` | Admin | Lazy | `requiresAuth` + `requiresAdmin` |

**載入策略**：核心店面三頁（`/`、`/products`、`/product/:slug`）靜態 import；
其餘一律 `() => import(...)`。

**頁面標題**：走 `meta.title` + `router.afterEach` 套用，不要在各元件自己設
（`ProductDetail` 是唯一例外，載入商品後覆蓋為商品名）。新增路由請一併給 `meta.title`，
格式 `<頁名>｜金同心實業`。

## 導航守衛

```js
router.beforeEach(async (to) => {
    if (to.meta.requiresAuth || to.meta.requiresAdmin) {
        const { useAuthStore } = await import('../stores/auth')   // 動態 import 避免循環相依
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return '/login'
        if (to.meta.requiresAdmin && !authStore.isAdmin) return '/account'
    }
})
```

守衛**不做任何 fetch**。因為 `main.js` 已保證掛載前 auth 狀態就緒（見下節），
守衛只讀狀態、不補抓資料，也不做 token refresh。

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
導向 authStore.accountRoute（/admin 或 /account）
```

### Gotchas

- **Redirect 白名單**：Directus 的 `AUTH_GOOGLE_REDIRECT_ALLOW_LIST` 必須逐一列出
  每個前端 origin 的 `/admin/callback`（正式站 + 各 dev 網域）。少了會在登入第一步被擋，
  回 `INVALID_PAYLOAD: URL ... can't be used to redirect after login`。**最常踩的坑。**
- **本機 dev 需 https + 自訂網域**：`vite.config.js` 的 `mkcert({ hosts: [...] })` 必須包含
  實際進站網域（如 `local.jaao.tw`），否則憑證不涵蓋、直接 `CERT_COMMON_NAME_INVALID`。
  該網域也要放進上面的白名單。
- **改 double-tap 要動 Worker**：callback 路徑或 double-tap 行為調整時，
  Worker（`worker/auth-callback-worker.js`）與前端必須一起改。
  送到 Directus 的 `code`/`state` **一個 byte 都不能改**（勿用 `URLSearchParams` 重新序列化）。
- **要優化先看 Worker log**：第二擊會 `console.log` 一筆 `sso_callback_upstream`
  （含 `ms`/`status`/`colo`/`ua`）。這是判斷還值不值得優化的唯一依據，不要憑感覺調。

## 角色與導向

| 角色 | `role.admin_access` | 登入後導向 | 可存取 |
|---|---|---|---|
| Admin | `true` | `/admin` | 全部 |
| Member(customer) | `false` | `/account` | 除 `/admin` 外全部 |
| 訪客 | — | `/login` | 公開頁 |

Directus 端目前有 3 個 role：`Administrator` / `customer` / `AI_agnet`。

## 新增路由步驟

1. 建 `src/views/NewPage.vue`
2. 加進 `src/router/index.js` 的 `routes`
3. 除核心店面頁外一律 lazy-load
4. 給 `meta.title`（格式 `<頁名>｜金同心實業`）
5. 需登入加 `meta: { requiresAuth: true }`；限管理員再加 `requiresAdmin: true`
