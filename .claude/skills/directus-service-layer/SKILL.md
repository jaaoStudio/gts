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
