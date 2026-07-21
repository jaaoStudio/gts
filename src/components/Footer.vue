<template>
  <footer class="relative overflow-hidden bg-steel-950 text-steel-300">
    <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-40" />
    <div class="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand-500/10 blur-[100px]" />

    <div class="relative mx-auto max-w-6xl px-5 pb-10 pt-20 sm:px-8">
      <!-- Top: call line -->
      <div class="flex flex-col gap-8 border-b border-white/10 pb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <img :src="horizontal" alt="GTS 金同心實業" class="h-24 w-auto" />
                  <p class="mt-5 max-w-sm text-sm leading-relaxed text-steel-400">
            在地深耕近三十年，為您提供專業、耐用的五金工具。品質嚴格把關，現貨穩定供應。
          </p>
        </div>

        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <a
            href="tel:0426580936"
            class="group inline-flex w-max items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 font-display text-base font-semibold text-steel-950 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 hover:text-white active:scale-[0.98]"
          >
            撥打 04-26580936
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-steel-100 text-steel-900 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-steel-950 group-hover:text-white">
              <PhPhoneCall :size="18" weight="bold" />
            </span>
          </a>
          <LineButton :floating="false" />
        </div>
      </div>

      <!-- Middle -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-4">
        <div>
          <h3 class="font-mono text-xs uppercase tracking-[0.2em] text-steel-500">商品分類</h3>
          <ul class="mt-5 space-y-3">
            <li v-for="cat in topCategories" :key="cat.id">
              <router-link :to="{ path: '/products', query: { category: cat.slug } }" class="text-sm text-steel-400 transition-colors hover:text-white">
                {{ cat.name }}
              </router-link>
            </li>
            <li>
              <router-link to="/products" class="text-sm text-brand-400 transition-colors hover:text-brand-300">查看全部 →</router-link>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="font-mono text-xs uppercase tracking-[0.2em] text-steel-500">客戶服務</h3>
          <ul class="mt-5 space-y-3">
            <li v-for="item in service" :key="item">
              <a href="#" class="text-sm text-steel-400 transition-colors hover:text-white">{{ item }}</a>
            </li>
          </ul>
        </div>

        <div class="col-span-2">
          <h3 class="font-mono text-xs uppercase tracking-[0.2em] text-steel-500">訂閱新品與優惠</h3>
          <p class="mt-5 text-sm text-steel-400">留下 Email，第一時間掌握新品上架與專屬優惠資訊。</p>
          <form class="mt-4 flex max-w-md gap-2" @submit.prevent>
            <input
              type="email"
              required
              placeholder="you@example.com"
              class="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-steel-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button class="flex-shrink-0 rounded-full bg-brand-500 px-6 py-3 font-display text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-600 active:scale-[0.98]">
              訂閱
            </button>
          </form>
          <div class="mt-6 flex items-center gap-3">
            <a href="#" aria-label="Facebook" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-steel-400 transition-colors hover:border-white/25 hover:text-white">
              <PhFacebookLogo :size="18" weight="fill" />
            </a>
            <a href="#" aria-label="Instagram" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-steel-400 transition-colors hover:border-white/25 hover:text-white">
              <PhInstagramLogo :size="18" weight="regular" />
            </a>
            <a href="#" aria-label="YouTube" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-steel-400 transition-colors hover:border-white/25 hover:text-white">
              <PhYoutubeLogo :size="18" weight="fill" />
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom -->
      <div class="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
        <p class="font-mono text-xs text-steel-500">© {{ year }} GTS Hardware. All rights reserved.</p>
        <div class="flex gap-6">
          <a href="#" class="text-xs text-steel-500 transition-colors hover:text-steel-300">隱私權政策</a>
          <a href="#" class="text-xs text-steel-500 transition-colors hover:text-steel-300">服務條款</a>
          <a href="#" class="text-xs text-steel-500 transition-colors hover:text-steel-300">網站地圖</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useCategoryStore } from '../stores/category'
import { PhPhoneCall, PhFacebookLogo, PhInstagramLogo, PhYoutubeLogo } from '@phosphor-icons/vue'
import horizontal from '@/assets/gts-lockup-horizontal-dark.svg'
import LineButton from './LineButton.vue'

const categoryStore = useCategoryStore()
const topCategories = computed(() => categoryStore.categoryTree.slice(0, 5))

const service = ['聯絡我們', '常見問題', '運送與退貨', '保固資訊', '訂單查詢']
const year = new Date().getFullYear()
</script>
