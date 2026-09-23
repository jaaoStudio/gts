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

        <!-- grid-cols-1 不是多餘的預設值：拿掉後手機版的欄寬會被縮圖列撐開，
             縮圖超過 4 張時主圖就比螢幕還寬。 -->
        <div class="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <!-- Gallery -->
          <div class="lg:sticky lg:top-24 lg:self-start">
            <div class="relative rounded-[2rem] bg-white p-2 ring-1 ring-steel-900/[0.06] shadow-[0_30px_60px_-30px_rgba(16,17,21,0.28)]">
              <button
                type="button"
                class="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[1.5rem] bg-steel-100"
                :aria-label="`放大檢視 ${product.name}`"
                @click="openLightbox"
              >
                <img :src="activeImageUrl" :alt="product.name" class="h-full w-full object-cover transition-opacity duration-300" />
              </button>
              <div v-if="productTags.length" class="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-2">
                <span
                  v-for="tag in productTags"
                  :key="tag.id"
                  class="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white shadow-md backdrop-blur"
                  :style="{ backgroundColor: tag.color || '#f97316' }"
                >
                  {{ tag.name }}
                </span>
              </div>

              <!-- 大圖與規格是兩個各自可切換的狀態：點共用圖不會改規格。拿掉這行標示，
                   畫面上就沒有任何東西說得出客人買的是哪一個。 -->
              <span
                v-if="selectedVariantLabel"
                class="pointer-events-none absolute bottom-5 left-5 max-w-[calc(100%-2.5rem)] truncate rounded-full bg-steel-900/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
              >
                {{ selectedVariantLabel }}
              </span>
            </div>

            <!-- 分段標示而非保證：gallery 裡仍混著規格照（issue #35），資料清到哪
                 這裡就乾淨到哪，不用再改程式。 -->
            <div v-if="thumbGroups.length" class="mt-4 space-y-3">
              <div v-for="group in thumbGroups" :key="group.label">
                <p class="mb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel-400">{{ group.label }}</p>
                <div class="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    v-for="img in group.images"
                    :key="img.id"
                    type="button"
                    class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all"
                    :class="activeImage?.id === img.id ? 'border-brand-500' : 'border-steel-200 hover:border-brand-500/50'"
                    :aria-current="activeImage?.id === img.id ? 'true' : undefined"
                    @click="activeImage = img"
                  >
                    <img :src="img.thumb" alt="" loading="lazy" class="h-full w-full object-cover" />
                  </button>
                </div>
              </div>
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

              <!-- Variants：規格與配件分兩區顯示，但**行為完全相同**——同一組單選，
                   選一個加一次。分區只是讓客人看得出哪些是加購品、哪些是三選一。 -->
              <div v-if="publishedVariants.length > 1" class="mt-6 space-y-5">
                <div v-for="group in variantGroups" :key="group.label">
                  <p class="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-steel-500">{{ group.label }}</p>
                  <div class="flex flex-wrap gap-2.5">
                    <button
                      v-for="variant in group.items"
                      :key="variant.id"
                      type="button"
                      @click="selectedVariant = variant"
                      class="rounded-xl border-2 px-4 py-3 text-left transition-all"
                      :class="selectedVariant?.id === variant.id ? 'border-brand-500 bg-brand-50' : 'border-steel-200 hover:border-steel-400'"
                    >
                      <span class="block font-display text-sm font-semibold text-steel-900">{{ variant.spec_name }}</span>
                      <span class="block font-mono text-xs text-steel-500">{{ formatPrice(variant.price) }}</span>
                    </button>
                  </div>
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

            <!-- 加入訂購單 -->
            <div v-if="publishedVariants.length" class="mt-6">
              <div class="flex flex-col gap-3 sm:flex-row">
                <div class="flex items-center gap-1 rounded-full border border-steel-200 p-1.5">
                  <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900 disabled:opacity-40"
                    :disabled="quantity <= 1"
                    aria-label="減少數量"
                    @click="quantity--"
                  >
                    <PhMinus :size="14" weight="bold" />
                  </button>
                  <span class="min-w-10 text-center font-mono text-sm font-semibold text-steel-900">
                    {{ quantity }}
                  </span>
                  <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900"
                    aria-label="增加數量"
                    @click="quantity++"
                  >
                    <PhPlus :size="14" weight="bold" />
                  </button>
                </div>

                <button
                  type="button"
                  class="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-steel-900 disabled:active:scale-100"
                  :disabled="!selectedVariant"
                  @click="addToOrder"
                >
                  <PhPlusCircle :size="20" weight="bold" />
                  <template v-if="!selectedVariant">{{ choosePrompt }}</template>
                  <template v-else>{{ justAdded ? '已加入訂購單' : '加入訂購單' }}</template>
                </button>
              </div>

              <router-link
                v-if="orderStore.count > 0"
                to="/order"
                class="mt-2.5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-steel-500 transition-colors hover:text-brand-500"
              >
                訂購單已有 {{ orderStore.count }} 件 <PhArrowRight :size="12" weight="bold" />
              </router-link>
            </div>

            <!-- 線上購買：外部通路導流 -->
            <div v-if="hasExternalChannel" class="mt-6">
              <p class="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-steel-500">線上購買</p>
              <div class="flex flex-col gap-3 sm:flex-row">
                <a
                  v-if="product.iopenUrl"
                  :href="product.iopenUrl"
                  target="_blank"
                  rel="noopener"
                  class="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-brand-500 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-600 active:scale-[0.98]"
                >
                  <PhStorefront :size="20" weight="bold" /> 到 iOPEN Mall 購買
                </a>
                <a
                  v-if="product.shopeeUrl"
                  :href="product.shopeeUrl"
                  target="_blank"
                  rel="noopener"
                  class="flex flex-1 items-center justify-center gap-2.5 rounded-full border border-steel-300 px-6 py-4 font-display text-base font-semibold text-steel-800 transition-colors duration-300 hover:border-[#EE4D2D] hover:text-[#EE4D2D]"
                >
                  <PhBagSimple :size="20" weight="bold" /> 到蝦皮購買
                </a>
              </div>
              <p class="mt-2.5 text-sm text-steel-500">可線上刷卡與超商取貨，付款與出貨由平台處理。</p>
            </div>

            <!-- Contact CTAs -->
            <p v-if="hasExternalChannel" class="mt-6 mb-3 font-mono text-xs uppercase tracking-[0.16em] text-steel-500">或聯絡我們</p>
            <div class="flex flex-col gap-3 sm:flex-row" :class="hasExternalChannel ? '' : 'mt-6'">
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
          <!-- eslint-disable-next-line vue/no-v-html -- 內容已於 sanitizedDescription 經 DOMPurify 消毒，見 script 區 -->
          <div class="prose prose-steel max-w-none rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6 sm:p-10" v-html="sanitizedDescription" />
        </div>
      </div>
    </main>

    <Footer />

    <!-- object-contain 不可換成 object-cover：大圖那邊是 cover，非正方形的圖在那裡
         被裁掉兩側，這裡是唯一看得到完整內容的地方。 -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-100 flex items-center justify-center bg-steel-900/90 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-label="`${product?.name} 放大檢視`"
        @click="lightboxOpen = false"
      >
        <img :src="lightboxUrl" :alt="product?.name" class="max-h-full max-w-full object-contain" @click.stop />
        <button
          ref="lightboxCloseRef"
          type="button"
          class="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="關閉放大檢視"
          @click="lightboxOpen = false"
        >
          <PhX :size="20" weight="bold" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import DOMPurify from 'dompurify'
import { setMeta } from '../utils/seo'
import { trackAddToCart, trackViewItem } from '../utils/analytics'
import { useRoute } from 'vue-router'
import { displayPrices, productService } from '../services/productService'
import { useCategoryStore } from '../stores/category'
import { useSettingsStore } from '../stores/settings'
import { normalizeSpecName, useOrderStore } from '../stores/order'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { PhCaretRight, PhPhoneCall, PhSmileyXEyes, PhStorefront, PhBagSimple,
         PhPlus, PhMinus, PhPlusCircle, PhArrowRight, PhX } from '@phosphor-icons/vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import heroPlaceholder from '@/assets/product-placeholder.svg'

const route = useRoute()
const categoryStore = useCategoryStore()
const settingsStore = useSettingsStore()
const orderStore = useOrderStore()

const product = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedVariant = ref(null)

// mapProduct 給的圖片物件 { id, thumb, card, detail, full }，不是網址字串
const activeImage = ref(null)

const activeImageUrl = computed(() => activeImage.value?.detail || heroPlaceholder)

// 「商品其他照片」= 主圖 + 共用圖，不等於 CONTEXT.md 定義的共用圖（見該詞條）
const sharedImages = computed(() => {
  if (!product.value) return []
  const all = [product.value.mainImage, ...(product.value.gallery || [])].filter(Boolean)
  return [...new Map(all.map((img) => [img.id, img])).values()]
})

const thumbGroups = computed(() => {
  const variantImage = selectedVariant.value?.images || null
  const groups = []
  if (variantImage) groups.push({ label: '此規格', images: [variantImage] })

  const shared = sharedImages.value.filter((img) => img.id !== variantImage?.id)
  if (shared.length) groups.push({ label: '商品其他照片', images: shared })

  // 全部加起來只有一張時整條縮圖列沒有意義
  return groups.reduce((n, g) => n + g.images.length, 0) > 1 ? groups : []
})

const lightboxOpen = ref(false)
const lightboxUrl = computed(() => activeImage.value?.full || heroPlaceholder)

const onLightboxKey = (e) => { if (e.key === 'Escape') lightboxOpen.value = false }

// 宣告了 aria-modal 就得負責焦點，否則鍵盤與輔助技術使用者會停在被宣告為惰性的區域外面。
// 這裡只做最低限度的進出，完整的 focus trap 全站沒有任何 modal 有，該一起做。
const lightboxCloseRef = ref(null)
let focusBeforeLightbox = null

const openLightbox = () => {
  if (!activeImage.value) return
  lightboxOpen.value = true
}

useBodyScrollLock(lightboxOpen)

watch(lightboxOpen, async (open) => {
  if (open) {
    window.addEventListener('keydown', onLightboxKey)
    focusBeforeLightbox = document.activeElement
    await nextTick()
    lightboxCloseRef.value?.focus()
  } else {
    window.removeEventListener('keydown', onLightboxKey)
    focusBeforeLightbox?.focus?.()
    focusBeforeLightbox = null
  }
})

// 外部通路連結只在詳情頁的 DETAIL_FIELDS 帶回，且已在 mapper 過濾過 scheme
const hasExternalChannel = computed(() => !!(product.value?.iopenUrl || product.value?.shopeeUrl))

const quantity = ref(1)
const justAdded = ref(false)
let addedTimer = null

const addToOrder = () => {
  if (!product.value || !selectedVariant.value) return

  orderStore.add(product.value, selectedVariant.value, quantity.value)
  trackAddToCart(
    product.value,
    quantity.value,
    normalizeSpecName(selectedVariant.value.spec_name)
  )
  quantity.value = 1

  // 短暫回饋，不用 toast 元件（全站目前沒有）
  justAdded.value = true
  clearTimeout(addedTimer)
  addedTimer = setTimeout(() => { justAdded.value = false }, 2000)
}

onBeforeUnmount(() => {
  clearTimeout(addedTimer)
  window.removeEventListener('keydown', onLightboxKey)
})

// mapProduct 已把標籤攤平成 tag 物件陣列（id/name/color）
const productTags = computed(() => product.value?.tags || [])

// 變體價格可能為 null（mapProduct 保留原值），統一格式化避免 null.toLocaleString() 崩潰
const formatPrice = (p) => (p != null ? `NT$${p.toLocaleString()}` : '詢價')

// 商品描述為 Directus rich-text，經 DOMPurify 消毒後才 v-html，防 stored XSS
const sanitizedDescription = computed(() =>
  product.value?.description ? DOMPurify.sanitize(product.value.description) : ''
)

// draft/archived 規格已在 productMapper.mapProduct 濾除，此處拿到的即是上架中的規格
const publishedVariants = computed(() => {
  if (!product.value?.variants) return []
  return product.value.variants
})

// 規格與配件分兩區顯示，但**行為完全相同**：同一組單選、選一個加一次。
// 分區只是讓客人看得出哪些是加購品。配件不進起價計算，那一步在 mapper 做。
const variantGroups = computed(() => {
  const specs = publishedVariants.value.filter((v) => !v.is_accessory)
  const accessories = publishedVariants.value.filter((v) => v.is_accessory)
  const groups = []
  if (specs.length) groups.push({ label: '選擇規格', items: specs })
  if (accessories.length) groups.push({ label: '專屬配件', items: accessories })
  return groups
})

// 整件商品的品項全被標成配件時畫面上沒有「規格」那一區，按鈕就不能叫客人去選一個
// 看不到的東西。目前沒有這種商品，但資料沒有任何地方擋著。
const choosePrompt = computed(() =>
  publishedVariants.value.some((v) => !v.is_accessory) ? '請先選擇規格' : '請先選擇配件'
)

// 單規格商品不標示：那是系統自動選的，標出來會讀成「你已經選好了」。
// 正規化為空要退回 raw，否則會與規格鈕上的 raw spec_name 分岔成一有一無。
const selectedVariantLabel = computed(() => {
  if (publishedVariants.value.length < 2 || !selectedVariant.value) return ''
  const raw = selectedVariant.value.spec_name
  const name = normalizeSpecName(raw) || (raw || '').trim()
  if (!name) return ''
  // 選到配件時不能寫「目前規格」——那正好是這次要讓客人分清楚的兩件事
  return `${selectedVariant.value.is_accessory ? '目前配件' : '目前規格'}：${name}`
})

const priceDisplay = computed(() => {
  if (publishedVariants.value.length === 0) return '詢問價格'
  // 與卡片的起價共用同一個函式，不是「照著寫一份」——先前兩份的退路條件分岔過
  const prices = displayPrices(publishedVariants.value)
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
  selectedVariant.value = null
  // 上一頁/下一頁在兩個商品之間切換時元件不會卸載，不關掉的話 lightbox 會蓋著
  // 上一個商品的照片留在新商品的骨架上
  lightboxOpen.value = false
  try {
    const data = await productService.getProductBySlug(slug)
    product.value = data
    if (data?.name) {
      trackViewItem(data)
      const title = `${data.name}｜金同心實業`
      document.title = title
      setMeta('og:title', title, 'property')
      setMeta('og:description', data.short_description || '專業五金工具與耗材供應。', 'property')
      if (data.socialImage) setMeta('og:image', data.socialImage, 'property')
    }
    activeImage.value = data?.mainImage || null

    // 只有單一規格時才自動選。多規格不可以預選陣列第一個——那等於用 Directus 的 id 序
    // 幫客人決定他要買哪一個。
    if (publishedVariants.value.length === 1) selectedVariant.value = publishedVariants.value[0]
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

// 切規格一律把大圖帶回該規格的圖；該規格沒有圖就退回商品主圖，而不是停在上一個
// 規格的圖上（那就是「看到的是別人的照片」）。
watch(selectedVariant, (newVal) => {
  activeImage.value = newVal?.images || product.value?.mainImage || null
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
