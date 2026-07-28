<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8">
      <!-- Loading -->
      <div v-if="loading" class="grid gap-12 lg:grid-cols-2">
        <div class="aspect-square animate-pulse rounded-[2rem] bg-steel-100" />
        <div class="space-y-4">
          <div class="h-10 w-3/4 animate-pulse rounded-lg bg-steel-100" />
          <div class="h-5 w-1/2 animate-pulse rounded-lg bg-steel-100" />
          <div class="h-28 animate-pulse rounded-2xl bg-steel-100" />
        </div>
      </div>

      <!-- Error / Not found -->
      <div v-else-if="error || !product" class="py-24 text-center">
        <PhSmileyXEyes :size="64" weight="thin" class="mx-auto text-steel-300" />
        <h2 class="mt-4 font-display text-2xl font-bold text-steel-900">找不到商品</h2>
        <p class="mt-2 text-steel-500">此商品可能已下架或不存在</p>
        <router-link to="/products" class="mt-6 inline-block rounded-full bg-steel-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500">
          瀏覽所有商品
        </router-link>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Breadcrumb -->
        <nav class="mb-6 flex flex-wrap items-center gap-1.5 font-mono text-xs text-steel-400">
          <router-link to="/" class="transition-colors hover:text-brand-600">首頁</router-link>
          <PhCaretRight :size="12" weight="bold" />
          <router-link to="/products" class="transition-colors hover:text-brand-600">所有商品</router-link>
          <template v-for="crumb in breadcrumbs" :key="crumb.id">
            <PhCaretRight :size="12" weight="bold" />
            <router-link :to="`/products?category=${crumb.slug}`" class="transition-colors hover:text-brand-600">{{ crumb.name }}</router-link>
          </template>
          <PhCaretRight :size="12" weight="bold" />
          <span class="text-steel-900">{{ product.name }}</span>
        </nav>

        <div class="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <!-- Gallery -->
          <div class="lg:sticky lg:top-24 lg:self-start">
            <div class="relative rounded-[2rem] bg-white p-2 ring-1 ring-steel-900/[0.06] shadow-[0_30px_60px_-30px_rgba(16,17,21,0.28)]">
              <div class="aspect-square overflow-hidden rounded-[1.5rem] bg-steel-100">
                <img :src="activeImage || heroPlaceholder" :alt="product.name" class="h-full w-full object-cover transition-opacity duration-300" />
              </div>
              <div v-if="productTags.length" class="absolute left-5 top-5 flex flex-wrap gap-2">
                <span
                  v-for="tag in productTags"
                  :key="tag.id"
                  class="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white shadow-md backdrop-blur"
                  :style="{ backgroundColor: tag.color || '#f97316' }"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>

            <div v-if="galleryImages.length > 1" class="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <button
                v-for="(img, index) in galleryImages"
                :key="index"
                @click="activeImage = img"
                class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all"
                :class="activeImage === img ? 'border-brand-500' : 'border-steel-200 hover:border-brand-500/50'"
              >
                <img :src="img" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>

          <!-- Info -->
          <div class="flex flex-col">
            <p v-if="product.category?.name" class="font-mono text-xs uppercase tracking-[0.18em] text-steel-400">{{ product.category.name }}</p>
            <h1 class="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-steel-900 sm:text-4xl">{{ product.name }}</h1>
            <p v-if="product.short_description" class="mt-4 text-lg leading-relaxed text-steel-500">{{ product.short_description }}</p>

            <!-- Price -->
            <div class="mt-7 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6">
              <p class="text-xs text-steel-400">價格</p>
              <p class="mt-1 font-mono text-4xl font-bold tracking-tight text-steel-900">
                {{ selectedVariant ? formatPrice(selectedVariant.price) : priceDisplay }}
              </p>

              <!-- Variants -->
              <div v-if="publishedVariants.length > 1" class="mt-6">
                <p class="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-steel-500">選擇規格</p>
                <div class="flex flex-wrap gap-2.5">
                  <button
                    v-for="variant in publishedVariants"
                    :key="variant.id"
                    @click="selectedVariant = variant"
                    class="rounded-xl border-2 px-4 py-3 text-left transition-all"
                    :class="selectedVariant?.id === variant.id ? 'border-brand-500 bg-brand-50' : 'border-steel-200 hover:border-steel-400'"
                  >
                    <span class="block font-display text-sm font-semibold text-steel-900">{{ variant.spec_name }}</span>
                    <span class="block font-mono text-xs text-steel-500">{{ formatPrice(variant.price) }}</span>
                  </button>
                </div>
              </div>

              <!-- Stock -->
              <div v-if="selectedVariant" class="mt-5">
                <span
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
                  :class="selectedVariant.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'"
                >
                  <span class="h-2 w-2 rounded-full" :class="selectedVariant.stock > 0 ? 'bg-emerald-500' : 'bg-brand-500'" />
                  {{ selectedVariant.stock > 0 ? `現貨 ${selectedVariant.stock} 件` : '暫時缺貨 · 可預訂' }}
                </span>
              </div>
            </div>

            <!-- Contact CTAs -->
            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:0426580936"
                class="group flex flex-1 items-center justify-center gap-2.5 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
              >
                <PhPhoneCall :size="20" weight="bold" /> 電話詢價
              </a>
              <a
                v-if="settingsStore.lineUrl"
                :href="settingsStore.lineUrl"
                target="_blank"
                rel="noopener"
                class="flex flex-1 items-center justify-center gap-2.5 rounded-full border border-steel-300 px-6 py-4 font-display text-base font-semibold text-steel-800 transition-colors duration-300 hover:border-[#06C755] hover:text-[#06C755]"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.135-.033.195-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE 詢問
              </a>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="product.description" v-reveal class="mt-20">
          <h2 class="mb-6 font-display text-2xl font-bold tracking-tight text-steel-900">商品介紹</h2>
          <div class="prose prose-steel max-w-none rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6 sm:p-10" v-html="sanitizedDescription" />
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DOMPurify from 'dompurify'
import { setMeta } from '../utils/seo'
import { useRoute } from 'vue-router'
import { productService } from '../services/productService'
import { useCategoryStore } from '../stores/category'
import { useSettingsStore } from '../stores/settings'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { PhCaretRight, PhPhoneCall, PhSmileyXEyes } from '@phosphor-icons/vue'

const route = useRoute()
const categoryStore = useCategoryStore()
const settingsStore = useSettingsStore()

const product = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedVariant = ref(null)
const activeImage = ref('')
import heroPlaceholder from '@/assets/product-placeholder.svg'

const galleryImages = computed(() => {
  if (!product.value) return []
  const imgs = []
  if (product.value.image) imgs.push(product.value.image)
  if (product.value.gallery && Array.isArray(product.value.gallery)) imgs.push(...product.value.gallery)
  return [...new Set(imgs)]
})

// mapProduct 已把標籤攤平成 tag 物件陣列（id/name/color）
const productTags = computed(() => product.value?.tags || [])

// 變體價格可能為 null（mapProduct 保留原值），統一格式化避免 null.toLocaleString() 崩潰
const formatPrice = (p) => (p != null ? `NT$${p.toLocaleString()}` : '詢價')

// 商品描述為 Directus rich-text，經 DOMPurify 消毒後才 v-html，防 stored XSS
const sanitizedDescription = computed(() =>
  product.value?.description ? DOMPurify.sanitize(product.value.description) : ''
)

const publishedVariants = computed(() => {
  if (!product.value?.variants) return []
  return product.value.variants
})

const priceDisplay = computed(() => {
  if (publishedVariants.value.length === 0) return '詢問價格'
  const prices = publishedVariants.value.map((v) => v.price).filter((p) => p !== null)
  if (prices.length === 0) return '詢問價格'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `NT$${min.toLocaleString()}`
  return `NT$${min.toLocaleString()} - NT$${max.toLocaleString()}`
})

const breadcrumbs = computed(() => {
  if (!product.value) return []
  const candidates = []
  if (product.value.category) candidates.push(product.value.category)
  if (product.value.categories && Array.isArray(product.value.categories)) candidates.push(...product.value.categories)
  const uniqueCandidates = [...new Map(candidates.map((c) => [c.slug, c])).values()]
  if (uniqueCandidates.length === 0) return []
  let longestPath = []
  uniqueCandidates.forEach((cat) => {
    const path = categoryStore.getCategoryBreadcrumb(cat.slug)
    if (path.length > longestPath.length) longestPath = path
  })
  return longestPath
})

const fetchProduct = async (slug) => {
  loading.value = true
  error.value = null
  try {
    const data = await productService.getProductBySlug(slug)
    product.value = data
    if (data?.name) {
      const title = `${data.name}｜金同心實業`
      document.title = title
      setMeta('og:title', title, 'property')
      setMeta('og:description', data.short_description || '專業五金工具與耗材供應。', 'property')
      if (data.image) setMeta('og:image', data.image, 'property')
    }
    if (data?.image) activeImage.value = data.image
    if (publishedVariants.value.length > 0) selectedVariant.value = publishedVariants.value[0]
  } catch (err) {
    error.value = 'Failed to load product'
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, (newSlug) => {
  if (newSlug) fetchProduct(newSlug)
}, { immediate: false })

watch(selectedVariant, (newVal) => {
  if (newVal && newVal.image) {
    activeImage.value = newVal.image
  } else if (product.value && product.value.image) {
    activeImage.value = product.value.image
  }
})

onMounted(() => {
  categoryStore.fetchCategories()
  if (route.params.slug) fetchProduct(route.params.slug)
})
</script>

<style scoped>
@reference "../style.css";

.prose {
  color: var(--color-steel-600);
}
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  @apply font-display text-steel-900;
}
.prose :deep(a) {
  @apply text-brand-600 no-underline hover:underline;
}
.prose :deep(img) {
  @apply rounded-xl shadow-md;
}
.prose :deep(table) {
  @apply w-full border-collapse text-sm;
}
.prose :deep(th),
.prose :deep(td) {
  @apply border border-steel-200 px-4 py-2 text-left;
}
.prose :deep(th) {
  @apply bg-steel-50 font-semibold text-steel-900;
}
</style>
