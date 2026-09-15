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

購物車與 consent 是本專案**僅有的兩個持久化到 localStorage 的 store**
（key `gts_order_items` / `gts_analytics_consent`）。購物車這邊多了幾條別的 store 沒有的規則：

- **`init()` 在 `main.js` 呼叫一次**，不是各元件 `onMounted`——Navbar 的件數紅點
  要在首次繪製就正確。解析失敗時丟棄並清 key，不讓壞資料卡住整個頁面。
- **`_persist()` 的失敗要吞掉**。無痕模式或配額滿時 `localStorage.setItem` 會丟例外；
  記憶體中的購物車仍可用，只是重整後消失，不該讓整個操作失敗。
- **存進去的是快照，會過期**。`revalidate()` 必須在每次開啟訂購單頁時跑，
  對照 Directus 現況處理「已刪除／已下架」與「價格已變動」。
  ⚠️ **驗證失敗時保留原有品項、不要清空**——寧可顯示舊價，也不要讓客人的訂購單無故消失。
- **`unitPrice` 用 `null` 表示詢價，絕不可寫 0**，否則會被誤讀成免費。
  小計一律只加總有價品項。

> 為什麼不用 pinia 持久化套件：兩個 store 的需求完全不同——購物車要的是
> 「還原後立刻對照後端重新驗證」，consent 要的是「跨分頁同步 + 每次變更都帶副作用」，
> 套件給的自動同步兩邊都不夠用。

## Consent Store Specifics（`stores/consent.js`）

- **`init()` 在 `main.js` 呼叫一次**（同 order store）：cookie banner 顯不顯示要在首次
  繪製就定案。`init()` 同時掛上 `storage` 監聽，讓其他分頁的撤回同步過來——否則在 A
  分頁撤回，B 分頁照樣追蹤。
- **三態 `null`（沒問過）/ `'granted'` / `'denied'`**。`null` 與 `'denied'` 不可混為
  一談，混了就是「拒絕的人每次進站被重新詢問」。
- **狀態與副作用一律走 `set()`**，不要在呼叫端自己配對「寫狀態 + 啟用/停用」。
  分開寫的那版漏掉了撤回，GA 照跑。`null` 也必須停用——banner 顯示期間使用者尚未
  重新同意。
- **`queued` 不是快取**：GA 啟動前送出的事件若直接推進 dataLayer 會排在 `config`
  前面，被 gtag 靜默丟棄，所以要排隊等啟動後補送。⚠️ 這讓 `track()` 的守衛變成測試
  盲區——守衛失守時事件會堆進佇列、等按下接受再整批補送，也就是把同意前的瀏覽紀錄
  回溯上傳。要測的是「同意前的行為不得在事後被補送」。

完整決策脈絡見 `docs/adr/0005`。
