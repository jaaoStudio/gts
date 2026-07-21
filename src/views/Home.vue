<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="overflow-x-clip">
      <!-- ===================== HERO ===================== -->
      <section ref="heroRef" class="relative">
        <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div class="pointer-events-none absolute right-[-10%] top-[-10%] h-[36rem] w-[36rem] rounded-full bg-brand-500/10 blur-[120px]" />

        <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-20 sm:px-8 lg:grid-cols-12 lg:pb-24 lg:pt-24">
          <!-- Copy -->
          <div class="lg:col-span-6">
            <span class="hero-el inline-flex items-center gap-2 rounded-full border border-steel-200 bg-white/70 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-steel-500 backdrop-blur">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-500" /> Est. 1995 · 專業五金供應
            </span>

            <h1 class="hero-el mt-6 font-display text-[2.7rem] font-bold leading-[1.05] tracking-tight text-steel-900 sm:text-6xl lg:text-[4.1rem]">
              五金工具，<br />
              選對<span class="text-brand-500">一次到位</span>。
            </h1>

            <p class="hero-el mt-6 max-w-md text-base leading-relaxed text-steel-500 sm:text-lg">
              精選各式手工具、耗材。
            </p>

            <div class="hero-el mt-9 flex flex-wrap items-center gap-3">
              <router-link
                to="/products"
                class="group inline-flex items-center gap-3 rounded-full bg-steel-900 py-2.5 pl-6 pr-2.5 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
              >
                瀏覽商品
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-white/25">
                  <PhArrowRight :size="18" weight="bold" />
                </span>
              </router-link>
              <a
                href="tel:0426580936"
                class="inline-flex items-center gap-2 rounded-full border border-steel-300 px-6 py-3.5 font-display text-base font-semibold text-steel-800 transition-colors duration-300 hover:border-steel-900 hover:bg-white"
              >
                <PhPhoneCall :size="18" weight="bold" /> 電話詢價
              </a>
            </div>
          </div>

          <!-- Showcase: draggable 3D ring of featured products -->
          <div class="hero-el lg:col-span-6">
            <HeroProductRing :products="ringProducts" />
          </div>
        </div>

        <!-- Value strip -->
        <div class="relative border-y border-steel-200 bg-white/60 backdrop-blur">
          <div class="mx-auto grid max-w-6xl grid-cols-2 divide-steel-200 px-5 sm:px-8 md:grid-cols-4 md:divide-x">
            <div v-for="v in values" :key="v.label" class="flex items-center gap-3 py-5 md:justify-center">
              <component :is="v.icon" :size="24" weight="regular" class="text-brand-500" />
              <div>
                <p class="font-display text-sm font-semibold text-steel-900">{{ v.label }}</p>
                <p class="text-xs text-steel-500">{{ v.sub }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================== FEATURED ===================== -->
      <section class="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div v-reveal class="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 class="max-w-xl font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
            本月精選
          </h2>
          <router-link to="/products" class="group inline-flex items-center gap-2 font-display text-sm font-semibold text-steel-700 hover:text-brand-600">
            查看所有商品
            <PhArrowRight :size="16" weight="bold" class="transition-transform group-hover:translate-x-1" />
          </router-link>
        </div>

        <!-- Loading -->
        <div v-if="productStore.loading" class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <div v-for="i in 4" :key="i" class="aspect-[3/4] animate-pulse rounded-[1.6rem] bg-steel-100" />
        </div>
        <!-- Error -->
        <div v-else-if="productStore.error" class="rounded-2xl border border-steel-200 bg-white py-16 text-center text-steel-500">
          {{ productStore.error }}
        </div>
        <!-- Empty -->
        <div v-else-if="productStore.products.length === 0" class="rounded-2xl border border-dashed border-steel-300 py-16 text-center text-steel-500">
          精選商品準備中，先看看
          <router-link to="/products" class="font-semibold text-brand-600">所有商品 →</router-link>
        </div>
        <!-- Grid -->
        <div v-else class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <div v-for="(product, i) in productStore.products" :key="product.id" v-reveal="{ delay: i * 0.06 }">
            <ProductCard :product="product" />
          </div>
        </div>
      </section>

      <!-- ===================== CATEGORY BENTO ===================== -->
      <section v-if="bentoCategories.length" class="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div v-reveal class="mb-10 max-w-xl">
          <p class="font-mono text-xs uppercase tracking-[0.2em] text-brand-600">Categories</p>
          <h2 class="mt-3 font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
            依分類搜尋
          </h2>
        </div>

        <div class="grid auto-rows-[minmax(150px,1fr)] grid-cols-2 gap-4 md:grid-cols-4">
          <router-link
            v-for="(cat, i) in bentoCategories"
            :key="cat.id"
            v-reveal="{ delay: i * 0.05 }"
            :to="{ path: '/products', query: { category: cat.slug } }"
            :class="[
              'group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1',
              i === 0
                ? 'col-span-2 row-span-2 bg-steel-900 text-white'
                : 'bg-white text-steel-900 ring-1 ring-steel-900/[0.06] hover:ring-steel-900/12',
            ]"
          >
            <div v-if="i === 0" class="pointer-events-none absolute inset-0 bg-blueprint opacity-30" />
            <div v-if="i === 0" class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
            <span
              :class="[
                'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                i === 0 ? 'bg-brand-500 text-white' : 'bg-steel-100 text-steel-700 group-hover:bg-brand-500 group-hover:text-white',
              ]"
            >
              <PhStack :size="22" weight="regular" />
            </span>
            <div class="relative">
              <p :class="['font-display font-semibold tracking-tight', i === 0 ? 'text-2xl' : 'text-lg']">{{ cat.name }}</p>
              <p :class="['mt-1 flex items-center gap-1 text-sm', i === 0 ? 'text-steel-300' : 'text-steel-500']">
                選購 <PhArrowRight :size="14" weight="bold" class="transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </router-link>
        </div>
      </section>

      <!-- ===================== CTA ===================== -->
      <section class="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div v-reveal class="relative overflow-hidden rounded-[2.5rem] bg-steel-900 px-6 py-16 text-center sm:px-16 sm:py-20">
          <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-30" />
          <div class="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[100px]" />

          <template v-if="!authStore.isAuthenticated">
            <h2 class="relative mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              加入會員，解鎖專屬優惠優惠
            </h2>
            <p class="relative mx-auto mt-4 max-w-md text-steel-300">
              Google 帳號一鍵登入，掌握到貨通知與會員專屬優惠。
            </p>
            <router-link
              to="/login"
              class="relative mt-9 inline-flex items-center gap-3 rounded-full bg-white py-2.5 pl-6 pr-2.5 font-display text-base font-semibold text-steel-950 transition-all duration-300 hover:bg-brand-500 hover:text-white active:scale-[0.98]"
            >
              使用 Google 登入
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-steel-100 text-steel-900">
                <PhArrowRight :size="18" weight="bold" />
              </span>
            </router-link>
          </template>
          <template v-else>
            <h2 class="relative mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              歡迎回來，{{ authStore.userName }}
            </h2>
            <p class="relative mx-auto mt-4 max-w-md text-steel-300">感謝支持，探索更多好料吧。</p>
            <router-link
              to="/products"
              class="relative mt-9 inline-flex items-center gap-3 rounded-full bg-brand-500 py-2.5 pl-6 pr-2.5 font-display text-base font-semibold text-white transition-all duration-300 hover:bg-brand-600 active:scale-[0.98]"
            >
              繼續選購
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <PhArrowRight :size="18" weight="bold" />
              </span>
            </router-link>
          </template>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useProductStore } from '../stores/product'
import { useCategoryStore } from '../stores/category'
import { useAuthStore } from '../stores/auth'
import { gsap } from 'gsap'
import Navbar from '../components/Navbar.vue'
import ProductCard from '../components/ProductCard.vue'
import HeroProductRing from '../components/HeroProductRing.vue'
import Footer from '../components/Footer.vue'
import {
  PhArrowRight, PhPhoneCall, PhShieldCheck, PhStack,
  PhTruck, PhMedal, PhHeadset,
} from '@phosphor-icons/vue'

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

const heroRef = ref(null)

const ringProducts = computed(() => productStore.products.slice(0, 4))
const bentoCategories = computed(() => categoryStore.categoryTree.slice(0, 5))

const values = [
  { icon: PhMedal, label: '原廠正品', sub: '嚴選品牌供應' },
  { icon: PhTruck, label: '快速出貨', sub: '現貨商品盡速安排寄出' },
  { icon: PhShieldCheck, label: '安心選購', sub: '新品瑕疵提供退換保障' },
  { icon: PhHeadset, label: '專人諮詢', sub: '選料一對一協助' },
]

onMounted(() => {
  productStore.fetchFeaturedProducts()
  categoryStore.fetchCategories()
  authStore.init()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = gsap.context(() => {
    gsap.from('.hero-el', {
      opacity: 0,
      y: 28,
      filter: 'blur(6px)',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.09,
    })
  }, heroRef.value)
  // cleanup on unmount
  heroRef.value?.addEventListener?.('destroy', () => ctx.revert())
})
</script>
