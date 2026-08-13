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
