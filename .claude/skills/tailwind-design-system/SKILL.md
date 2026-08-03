---
name: TailwindCSS & Design System
description: TailwindCSS configuration, brand tokens, and UI design patterns used in the GTS Web Store.
---

# TailwindCSS & Design System

## TailwindCSS Version

This project uses **TailwindCSS 3** with PostCSS and Autoprefixer.

## Configuration (`tailwind.config.js`)

```js
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#f97316',   // Orange-500 — CTA, highlights
        'brand-secondary': '#1e293b', // Slate-800 — dark backgrounds
        'brand-accent': '#3b82f6',    // Blue-500 — accent elements
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
}
```

## Global Styles (`src/style.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Base resets for `:root`, `body`, `a`, `button` are defined here. Uses `prefers-color-scheme` media query for light/dark defaults.

## Common UI Patterns

### Page Layout
```html
<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
  <Navbar />
  <main class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <!-- content -->
  </main>
  <Footer />
</div>
```

### Cards
```html
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
```

### Buttons

| Type | Classes |
|---|---|
| Primary | `bg-brand-primary hover:bg-orange-600 text-white font-bold rounded-lg` |
| Outline | `border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white` |
| Danger | `text-red-500 hover:text-white border border-red-300 hover:bg-red-500` |
| Ghost | `bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30` |

### Loading Spinner
```html
<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
```

### Badge / Tag
```html
<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
  會員
</span>
```

### Gradient Text (Logo)
```html
<span class="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
  GTS
</span>
```

## Dark Mode

- Support both light and dark via `dark:` variant classes.
- Follow the pattern: `bg-white dark:bg-slate-800`, `text-slate-900 dark:text-white`.
- Use `dark:bg-slate-900` for page backgrounds, `dark:bg-slate-800` for cards.

## Responsive Breakpoints

| Prefix | Min width | Usage |
|---|---|---|
| (none) | 0px | Mobile-first base |
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktop |

Grid examples:
- Products: `grid-cols-2 lg:grid-cols-3`
- Features: `grid-cols-1 md:grid-cols-3`
- Footer: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

## Transitions

- Interactive elements: `transition-colors duration-300`
- Cards / hover effects: `transition-all duration-300`
- Transforms: `hover:-translate-y-1`, `hover:scale-105`
- Dropdown menus: `transition-all duration-200 transform origin-top scale-95 group-hover:scale-100`
