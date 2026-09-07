---
name: Directus Service Layer
description: Conventions for Directus SDK usage, service objects, and data mapping in the GTS Web Store.
---

# Directus Service Layer Conventions

## Architecture

```
utils/directus.js          → SDK instance (singleton)
services/<domain>Service.js → API calls + data mapper
stores/<domain>.js          → UI state (calls service)
```

Components **never** call Directus directly. They interact via Pinia stores, which delegate to services.

## Directus Client (`utils/directus.js`)

```js
import { createDirectus, rest, authentication } from '@directus/sdk'

const directus = createDirectus(apiUrl)
    .with(authentication('session', { credentials: 'include', autoRefresh: true }))
    .with(rest({
        credentials: 'include',
        onRequest: (options) => ({ ...options, cache: 'no-cache' }),
    }))

export default directus
```

- **Singleton**: one shared instance, imported everywhere.
- **session 模式**：credential 是 httpOnly session cookie，**前端不持有 access token**
  （不進 JS/localStorage，防 XSS）。**不要改回 `authentication('json')` 或呼叫 `setToken()`。**
  認證流程細節見 skill `routing-and-auth`。
- **`cache: 'no-cache'` 不可拿掉**：Directus 讀取回應帶 `Cache-Control: private, max-age=300`，
  拿掉會造成「後台存檔後重整仍看到舊資料」。
- **Relative URL handling**: if `VITE_DIRECTUS_URL` starts with `/`, prepend `window.location.origin`.
- `getAssetUrl(id)`: converts a Directus file UUID to a full asset URL.

## Service Object Pattern

Services are plain JS objects (not classes) exported from `src/services/`:

```js
export const productService = {
    async getProducts({ page, limit, filter, sort }) { ... },
    async getFeatured(limit) { ... },
    async getByCategory(categoryId, opts) { ... },
    async search(keyword, opts) { ... },
    async getProductBySlug(slug) { ... },
    // ...
}
```

### Key Conventions

1. **Shared field lists**: Define `LIST_FIELDS` and `DETAIL_FIELDS` constants at module top.
2. **Base filter**: Always merge with `BASE_FILTER` (`status: 'published'`).
3. **Method reuse**: Higher-level methods call `getProducts()` internally.
4. **Pagination**: Use `offset = (page - 1) * limit` with Directus `readItems`.
5. **Count queries**: Use `aggregate('collection', { aggregate: { count: '*' } })` in parallel with data fetch.
6. **Return shape**: `{ data: [...], meta: { total_count, total_pages, current_page } }`

## Data Mapper Pattern

Export a `productMapper` alongside the service:

```js
export const productMapper = {
    mapProduct(item) { ... },   // Single item transform
    mapProducts(items) { ... }, // Array transform
}
```

### Mapper Responsibilities
- Convert Directus file UUIDs to full URLs via `getAssetUrl()`.
- Calculate derived fields (e.g., `displayPrice` from variants min price).
- **濾除下架規格**：`mapProduct` 會先排除 `status` 為 `draft`/`archived` 的 variant，
  之後才算最低價。故列表卡片與詳情頁看到的規格一致。用「排除 draft/archived」而非
  「只留 published」，避免 status 為空的舊資料被誤砍。
- Normalize relational data. **分類已全面改用 M2M**（每商品 `[父, 子]`）；主分類取「有 parent 的子分類葉節點」，M2O `category` 已棄用全空。批次維運/重歸類見 `directus-catalog-categorization`。
- Extract tag badges.
- Process gallery images.

## Directus SDK Usage

```js
import { readItems, readMe, aggregate, logout } from '@directus/sdk'

// Read items
directus.request(readItems('products', { filter, fields, sort, limit, offset }))

// Current user
directus.request(readMe({ fields: ['*', 'role.*'] }))

// Aggregate count
directus.request(aggregate('products', { aggregate: { count: '*' }, query: { filter } }))
```

## Filter Building

Use `buildFilter()` for complex multi-condition queries:

```js
buildFilter({ categoryIds, keyword }) {
    const filters = []
    if (categoryIds.length > 0) { filters.push({ categories: { categories_id: { id: { _in: categoryIds } } } }) }
    if (keyword) { filters.push({ _or: [{ name: { _contains: keyword } }, ...] }) }
    if (filters.length === 0) return {}
    if (filters.length === 1) return filters[0]
    return { _and: filters }
}
```

## Order Service（`services/orderService.js`）

訂購單的讀寫與其他 service 有幾點根本不同，動它之前先讀：

- **建立訂單時刻意不送 `customer`**。該欄位已從 `customer access` 的可寫清單移除
  （送了直接 403），改由 `items.create` 的 Directus Flow 依登入帳號反查後補上。
  這是為了讓「把訂單掛到別人名下」在寫入端就不可能發生。
- **因此 `createItem` 回傳 `null`**。建立當下 `customer` 還是空的，讀取權限
  `customer.user_id = $CURRENT_USER` 不成立，Directus 回 **HTTP 204**、SDK 回 `null`，
  **拿不到 id**。所以流程是「送出前記下自己看得到的最大 id → 輪詢等 id 更大的那筆出現」
  （`getLatestOrderId()` + `waitForNewOrder()`），不能直接用回傳值。
- **讀取一律不帶 customer 條件**。權限已在 Directus 端過濾，前端不重複實作。
- **金額欄位前端一律唯讀**。`confirmed_total` / `confirmed_price` / `status` 送了都會 403。
  客人唯一能寫的是 `payment_note`（回報匯款末五碼），且限 `status = quoted`。

### ⚠️ 新增 Directus 欄位後必須同步權限的欄位清單

`customer access` 對 `products` / `site_settings` / `categories` 等的 read 是
**逐一列欄位而非 `*`**。查一個沒開放的欄位會讓**整個請求**回 FORBIDDEN——
不是少那一欄，是整包失敗。曾因新增 `iopen_url` 導致已登入客戶連商品頁都打不開，
而匿名訪客不受影響（public policy 是 `*`），所以用匿名或管理員測都測不出來。
