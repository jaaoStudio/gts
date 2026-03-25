---
name: Routing & Authentication
description: Route definitions, navigation guards, and Google OAuth SSO flow for the GTS Web Store.
---

# Routing & Authentication Conventions

## Route Definitions (`src/router/index.js`)

### Structure

```js
const routes = [
    { path: '/:pathMatch(.*)*', redirect: '/' },  // Catch-all → Home
    { path: '/', name: 'Home', component: Home },  // Eager-loaded
    // ...
    { path: '/login', name: 'Login', component: () => import('...') },  // Lazy-loaded
]
```

### Loading Strategy

| Route | Loading | Reason |
|---|---|---|
| `/`, `/products`, `/product/:slug` | **Eager** (static import) | Core storefront, should load fast |
| `/login`, `/admin/callback`, `/account`, `/admin` | **Lazy** (dynamic import) | Auth-related, not always needed |

### Meta Fields

```js
{ meta: { requiresAuth: true } }            // Logged-in users only
{ meta: { requiresAuth: true, requiresAdmin: true } }  // Admin users only
```

## Navigation Guards

The router has a global `beforeEach` guard that:

1. Checks `requiresAuth` / `requiresAdmin` meta.
2. Redirects unauthenticated users to `/login`.
3. Auto-fetches user data if `accessToken` exists but `user === null` (page refresh scenario).
4. Redirects non-admin users from admin routes to `/account`.

```js
router.beforeEach(async (to) => {
    if (to.meta.requiresAuth || to.meta.requiresAdmin) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return '/login'
        if (!authStore.user) {
            await authStore.fetchCurrentUser()
            if (!authStore.isAuthenticated) return '/login'
        }
        if (to.meta.requiresAdmin && !authStore.isAdmin) return '/account'
    }
})
```

> **Note**: The auth store is dynamically imported inside the guard to avoid circular dependency issues.

## Google OAuth SSO Flow

```
    User clicks login
         │
         ▼
   Redirect to Directus SSO
   GET /auth/login/google?redirect=<callback>
         │
         ▼
   Google OAuth consent screen
         │
         ▼
   Redirect back to /admin/callback
         │
         ▼
   AdminCallback.vue calls authStore.handleCallback()
         │
         ├─ POST /auth/refresh (withCredentials) → get access_token
         ├─ directus.setToken(accessToken)
         ├─ Save to localStorage
         └─ fetchCurrentUser() → readMe + fetchCustomerProfile
         │
         ▼
   Redirect to authStore.accountRoute (/admin or /account)
```

## Role-Based Routing

| Role | `admin_access` | Post-login redirect | Accessible pages |
|---|---|---|---|
| Admin | `true` | `/admin` | All pages |
| Member | `false` | `/account` | All except `/admin` |
| Guest | N/A | `/login` | Public pages only |

## Scroll Behavior

Router restores scroll position on back/forward navigation; resets to top on new page visits:

```js
scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
}
```

## Adding New Routes

1. Create view in `src/views/NewPage.vue`.
2. Add route to `routes` array in `src/router/index.js`.
3. Use lazy-loading (`() => import(...)`) unless it's a core storefront page.
4. Add `meta: { requiresAuth: true }` if auth is required.
5. Add `meta: { requiresAdmin: true }` if admin-only.
