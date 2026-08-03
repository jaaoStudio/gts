---
name: GTS Web Store - Project Overview
description: Core architecture, tech stack, and project conventions for the GTS hardware e-commerce storefront.
---

# GTS Web Store — Project Overview

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) | ^3.5 |
| Build Tool | Vite | ^5.4 |
| State Management | Pinia (Options API style) | ^3.0 |
| Routing | Vue Router 4 | ^4.6 |
| Styling | TailwindCSS 3 + custom brand tokens | ^3.4 |
| Backend / CMS | Directus (headless CMS via `@directus/sdk`) | ^20.3 |
| HTTP Client | Axios (for auth refresh) + Directus SDK (for data) | — |
| Dev HTTPS | `vite-plugin-mkcert` | — |
| Deployment | Docker (multi-stage: node → nginx) | — |

## Project Structure

```
src/
├── main.js              # App entry: createApp → Pinia → Router → mount
├── App.vue              # Root: <router-view /> only
├── style.css            # Global CSS (Tailwind directives + base resets)
├── assets/              # Static assets
├── components/          # Shared UI components
│   ├── Navbar.vue       # Sticky nav, category dropdown, search, user menu
│   ├── Footer.vue       # Site footer with links & newsletter
│   ├── HeroParallax.vue # Hero banner with parallax scroll
│   └── ProductCard.vue  # Reusable product card
├── views/               # Route-level page components
│   ├── Home.vue         # Landing page (hero + featured + CTA)
│   ├── Products.vue     # Product listing (sidebar filters + pagination)
│   ├── ProductDetail.vue# Single product page (gallery + variants)
│   ├── Account.vue      # Member profile page (requires auth)
│   ├── Admin.vue         # Admin dashboard (requires admin role)
│   ├── AdminLogin.vue   # Google OAuth login page
│   └── AdminCallback.vue# OAuth callback handler
├── stores/              # Pinia stores
│   ├── auth.js          # Authentication state (Google SSO, roles)
│   ├── product.js       # Product listing state (pagination, filters)
│   └── category.js      # Category tree state (caching, hierarchy)
├── services/            # Business logic & API calls
│   └── productService.js # Directus CRUD + productMapper
├── utils/               # Utility modules
│   └── directus.js      # Directus SDK instance + getAssetUrl()
└── router/
    └── index.js         # Routes + navigation guards
```

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `VITE_DIRECTUS_URL` | Directus backend API base (可為相對路徑 `/api`) | `https://gts-core.jaao.tw` |
| `VITE_DIRECTUS_PUBLIC_URL` | Directus public-facing URL for assets & SSO | `https://gts-core.jaao.tw` |
| `REMOTE_REGISTRY_IP` | Docker registry IP (docker-compose) | `192.168.x.x` |
| `FRONTEND_VERSION` | Docker image tag | `1.0.0` |

## Brand Design Tokens

Defined in `tailwind.config.js`:

| Token | CSS Class | Color |
|---|---|---|
| Primary | `brand-primary` | `#f97316` (Orange-500) |
| Secondary | `brand-secondary` | `#1e293b` (Slate-800) |
| Accent | `brand-accent` | `#3b82f6` (Blue-500) |
| Font | `font-sans` | Inter, sans-serif |

## UI Language

- All user-facing text is **Traditional Chinese (zh-TW)**.
- Code comments are also predominantly in Chinese.
- When adding new UI text, always use zh-TW.

## Key Commands

```bash
npm run dev      # Start dev server (HTTPS on port 5174)
npm run build    # Production build → dist/
npm run preview  # Preview production build

# Docker
docker compose up -d --build   # Build & run with nginx
```
