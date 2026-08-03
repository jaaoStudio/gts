---
name: Vue Component Conventions
description: Coding standards for Vue 3 SFC components in the GTS Web Store project.
---

# Vue Component Conventions

## SFC Structure

All components use `<script setup>` syntax (Composition API). The order within a `.vue` file is:

```
<template> → <script setup> → <style scoped> (optional)
```

## Template Rules

1. **Root wrapper**: Each page view wraps content in `<div class="min-h-screen bg-slate-50 dark:bg-slate-900">`.
2. **Layout composition**: Pages include `<Navbar />` at top, `<Footer />` at bottom.
3. **Loading state**: Use a spinning div:
   ```html
   <div v-if="store.loading" class="flex justify-center items-center h-64">
     <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
   </div>
   ```
4. **Error state**: Red text centered:
   ```html
   <div v-else-if="store.error" class="text-center text-red-500 py-10">
     {{ store.error }}
   </div>
   ```
5. **Container**: Use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for page content width.
6. **Conditional rendering flow**: Always follow `v-if="loading"` → `v-else-if="error"` → `v-else` pattern.

## Script Setup Rules

1. **Imports order**: Vue APIs → Vue Router → Pinia stores → Components → Services/utils
   ```js
   import { ref, computed, onMounted } from 'vue'
   import { useRouter } from 'vue-router'
   import { useProductStore } from '../stores/product'
   import Navbar from '../components/Navbar.vue'
   ```
2. **Store instantiation**: Use `const xxxStore = useXxxStore()` at top level.
3. **Props**: Use `defineProps({ ... })` with type and required.
4. **No `<script>` block**: Never use Options API in components — only `<script setup>`.

## Component Naming

| Type | Location | Naming |
|---|---|---|
| Page view | `src/views/` | PascalCase (e.g., `ProductDetail.vue`) |
| Shared component | `src/components/` | PascalCase (e.g., `ProductCard.vue`) |

## Styling

- **Primary method**: TailwindCSS utility classes directly in templates.
- **Scoped styles**: Only used when CSS animations are needed (e.g., `HeroParallax.vue`).
- **Dark mode**: Always include `dark:` variant classes alongside light classes.
- **Responsive**: Use `sm:`, `md:`, `lg:` breakpoint prefixes (mobile-first).
- **Transitions**: Add `transition-colors duration-300` or `transition-all duration-300` on interactive elements.
- **Hover effects**: Use `hover:` and `group-hover:` for card interactions.

## Routing Navigation

- Use `<router-link :to="...">` for declarative nav.
- Use `router.push()` / `router.replace()` for programmatic nav.
- Use query params for filters: `{ path: '/products', query: { category: slug } }`.

## Section Comments

Use HTML comments to label template sections:
```html
<!-- Features Section -->
<!-- CTA Section -->
<!-- Desktop Menu -->
<!-- Mobile Menu -->
```
