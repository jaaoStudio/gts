---
name: Pinia Store Conventions
description: Standards for writing Pinia stores in the GTS Web Store project.
---

# Pinia Store Conventions

## Store Style

All stores use the **Options API** style of `defineStore()`:

```js
import { defineStore } from 'pinia'

export const useXxxStore = defineStore('xxx', {
    state: () => ({ ... }),
    getters: { ... },
    actions: { ... }
})
```

> **Why Options API?** This project consistently uses the Options style for stores. Do NOT mix in Composition-style (`setup()`) stores.

## Naming

- File: `src/stores/<domain>.js` (e.g., `auth.js`, `product.js`, `category.js`)
- Export: `useXxxStore` (e.g., `useAuthStore`, `useProductStore`)
- Store ID: snake_case matching the domain (e.g., `'auth'`, `'product'`, `'category'`)

## State Conventions

Every store's `state()` should include common fields:

```js
state: () => ({
    loading: false,    // Loading indicator
    error: null,       // Error message string or null
    // ... domain-specific state
})
```

## Getters

- Use arrow-function getters for simple derived state: `isAuthenticated: (state) => !!state.accessToken`
- Use `this` (function keyword) when calling other getters:
  ```js
  getCategoryNameBySlug() {
      return (slug) => {
          const found = this.getCategoryBySlug(slug);
          return found ? found.name : slug;
      }
  }
  ```
- Parameterized getters return a function: `getCategoryBySlug: (state) => (slug) => { ... }`

## Actions

- All async actions set `this.loading = true` at start and `this.loading = false` in `finally`.
- Error handling: catch → set `this.error` → `console.error()`.
- Private methods: prefix with underscore (e.g., `_saveTokens()`).
- Caching: use a `loaded` flag to prevent redundant API calls (see `category.js`):
  ```js
  async fetchCategories() {
      if (this.loaded) return this.categories
      // ...fetch logic...
      this.loaded = true
  }
  ```

## Store Interaction

- Stores can import and use other stores: `const categoryStore = useCategoryStore()`
- Always check if dependent data is loaded before using:
  ```js
  if (!categoryStore.loaded) {
      await categoryStore.fetchCategories()
  }
  ```

## Auth Store Specifics

- Token persistence: `localStorage` (`auth_access_token`)
- Init on mount: call `authStore.init()` in `onMounted` of pages needing auth state.
- Role check: `state.user?.role?.admin_access === true`
- Dynamic route: `accountRoute` getter returns `/admin` or `/account` based on role.

## Order Store Specifics（`stores/order.js`）

購物車是本專案**唯一持久化到 localStorage 的 store**（key `gts_order_items`），
因此多了幾條別的 store 沒有的規則：

- **`init()` 在 `main.js` 呼叫一次**，不是各元件 `onMounted`——Navbar 的件數紅點
  要在首次繪製就正確。解析失敗時丟棄並清 key，不讓壞資料卡住整個頁面。
- **`_persist()` 的失敗要吞掉**。無痕模式或配額滿時 `localStorage.setItem` 會丟例外；
  記憶體中的購物車仍可用，只是重整後消失，不該讓整個操作失敗。
- **存進去的是快照，會過期**。`revalidate()` 必須在每次開啟訂購單頁時跑，
  對照 Directus 現況處理「已刪除／已下架」與「價格已變動」。
  ⚠️ **驗證失敗時保留原有品項、不要清空**——寧可顯示舊價，也不要讓客人的訂購單無故消失。
- **`unitPrice` 用 `null` 表示詢價，絕不可寫 0**，否則會被誤讀成免費。
  小計一律只加總有價品項。

> 為什麼不用 pinia 持久化套件：只有這一個 store 需要，而且需要的是
> 「還原後立刻對照後端重新驗證」，套件給的自動同步反而不夠用。
