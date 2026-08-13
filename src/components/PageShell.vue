<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <header v-reveal class="mb-10 border-b border-steel-200 pb-8">
        <p v-if="eyebrow" class="font-mono text-xs uppercase tracking-[0.2em] text-brand-600">{{ eyebrow }}</p>
        <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">{{ title }}</h1>
        <p v-if="updated" class="mt-3 font-mono text-xs text-steel-400">最後更新：{{ updated }}</p>
        <p v-if="lead" class="mt-4 max-w-2xl leading-relaxed text-steel-500">{{ lead }}</p>
      </header>

      <!-- 包一層純 block wrapper 只為掛 v-reveal；max-w/px 由 <main> 決定，不影響版面 -->
      <div v-reveal="{ delay: 0.08 }">
        <slot />
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import Navbar from './Navbar.vue'
import Footer from './Footer.vue'

defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  updated: { type: String, default: '' },
  lead: { type: String, default: '' },
})
</script>
