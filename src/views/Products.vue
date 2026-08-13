<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8">
      <!-- Header -->
      <div v-reveal class="mb-8">
        <nav class="flex flex-wrap items-center gap-1.5 font-mono text-xs text-steel-400">
          <router-link to="/" class="transition-colors hover:text-brand-600">首頁</router-link>
          <PhCaretRight :size="12" weight="bold" />
          <router-link to="/products" class="transition-colors hover:text-brand-600" :class="{ 'text-steel-900': !categorySlug && !searchKeyword }">所有商品</router-link>
          <template v-if="categorySlug">
            <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
              <PhCaretRight :size="12" weight="bold" />
              <router-link :to="{ path: '/products', query: { category: crumb.slug } }" class="transition-colors hover:text-brand-600" :class="{ 'text-steel-900': index === breadcrumbs.length - 1 }">
                {{ crumb.name }}
              </router-link>
            </template>
          </template>
          <template v-else-if="searchKeyword">
            <PhCaretRight :size="12" weight="bold" />
            <span class="text-steel-900">搜尋結果</span>
          </template>
        </nav>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h1 class="font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
            <span v-if="categorySlug">{{ currentCategory }}</span>
            <span v-else-if="searchKeyword">搜尋：<span class="text-brand-500">{{ searchKeyword }}</span></span>
            <span v-else>所有商品</span>
          </h1>
          <button
            v-if="categorySlug || searchKeyword"
            @click="clearFilters"
            class="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-4 py-2 text-sm text-steel-600 transition-colors hover:border-steel-900 hover:text-steel-900"
          >
            <PhX :size="14" weight="bold" /> 清除篩選
          </button>
        </div>
        <p v-if="productStore.totalItems > 0" class="mt-2 font-mono text-sm text-steel-500">共 {{ productStore.totalItems }} 件商品</p>
      </div>

      <!-- Mobile category pills -->
      <div class="mb-6 -mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-hide lg:hidden">
        <router-link
          to="/products"
          class="flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          :class="!categorySlug ? 'border-steel-900 bg-steel-900 text-white' : 'border-steel-200 bg-white text-steel-600'"
        >
          全部
        </router-link>
        <router-link
          v-for="cat in categoryTree"
          :key="cat.id"
          :to="{ path: '/products', query: { category: cat.slug } }"
          class="flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          :class="categorySlug === cat.slug ? 'border-steel-900 bg-steel-900 text-white' : 'border-steel-200 bg-white text-steel-600'"
        >
          {{ cat.name }}
        </router-link>
      </div>

      <div class="flex flex-col gap-10 lg:flex-row">
        <!-- Sidebar -->
        <aside class="hidden w-60 flex-shrink-0 lg:block">
          <div class="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto scrollbar-hide rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6">
            <h3 class="font-mono text-xs uppercase tracking-[0.2em] text-steel-400">商品分類</h3>
            <ul class="mt-5 space-y-1">
              <li>
                <router-link
                  to="/products"
                  class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  :class="!categorySlug ? 'bg-brand-50 text-brand-700' : 'text-steel-600 hover:bg-steel-50 hover:text-steel-900'"
                >
                  所有商品
                </router-link>
              </li>
              <li v-for="cat in categoryTree" :key="cat.id">
                <router-link
                  :to="{ path: '/products', query: { category: cat.slug } }"
                  class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  :class="categorySlug === cat.slug ? 'bg-brand-50 text-brand-700' : 'text-steel-700 hover:bg-steel-50 hover:text-steel-900'"
                >
                  {{ cat.name }}
                </router-link>
                <ul v-if="cat.children?.length" class="ml-3 mt-1 space-y-0.5 border-l border-steel-200 pl-3">
                  <li v-for="child in cat.children" :key="child.id">
                    <router-link
                      :to="{ path: '/products', query: { category: child.slug } }"
                      class="block rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                      :class="categorySlug === child.slug ? 'text-brand-600 font-medium' : 'text-steel-500 hover:text-brand-600'"
                    >
                      {{ child.name }}
                    </router-link>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </aside>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <!-- Loading -->
          <div v-if="productStore.loading" class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            <div v-for="i in 6" :key="i" class="aspect-[3/4] animate-pulse rounded-[1.6rem] bg-steel-100" />
          </div>

          <!-- Error -->
          <div v-else-if="productStore.error" class="rounded-2xl border border-steel-200 bg-white py-20 text-center text-steel-500">
            {{ productStore.error }}
          </div>

          <!-- Empty -->
          <div v-else-if="productStore.products.length === 0" class="rounded-[1.5rem] border border-dashed border-steel-300 py-20 text-center">
            <PhPackage :size="56" weight="thin" class="mx-auto text-steel-300" />
            <h3 class="mt-4 font-display text-xl font-semibold text-steel-900">找不到商品</h3>
            <p class="mt-2 text-steel-500">
              <span v-if="searchKeyword">「{{ searchKeyword }}」沒有符合的結果</span>
              <span v-else-if="categorySlug">此分類目前沒有商品</span>
              <span v-else>目前沒有可顯示的商品</span>
            </p>
            <router-link to="/products" class="mt-6 inline-block rounded-full bg-steel-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500">
              瀏覽所有商品
            </router-link>
          </div>

          <!-- Grid -->
          <div v-else>
            <div class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              <div v-for="(product, i) in productStore.products" :key="product.id" v-reveal="{ delay: (i % 3) * 0.05 }">
                <ProductCard :product="product" />
              </div>
            </div>

            <!-- Pagination -->
            <nav v-if="productStore.totalPages > 1" class="mt-14 flex flex-col items-center gap-4" aria-label="分頁導覽">
              <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <button
                  @click="goToPage(1)"
                  :disabled="!productStore.hasPrevPage"
                  class="hidden h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
                  aria-label="第一頁"
                >
                  <PhCaretDoubleLeft :size="16" weight="bold" />
                </button>
                <button
                  @click="goToPage(productStore.currentPage - 1)"
                  :disabled="!productStore.hasPrevPage"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="上一頁"
                >
                  <PhCaretLeft :size="16" weight="bold" />
                </button>

                <!-- 以 index 當 key：省略號可能出現兩次，用值當 key 會重複 -->
                <template v-for="(item, idx) in pageItems" :key="idx">
                  <span
                    v-if="item === ELLIPSIS"
                    class="flex h-10 w-6 items-end justify-center pb-2 font-mono text-sm text-steel-400"
                    aria-hidden="true"
                  >…</span>
                  <button
                    v-else
                    @click="goToPage(item)"
                    class="h-10 min-w-10 rounded-full px-3 font-mono text-sm font-medium transition-colors"
                    :class="item === productStore.currentPage ? 'bg-steel-900 text-white' : 'border border-steel-200 bg-white text-steel-700 hover:border-steel-900'"
                    :aria-current="item === productStore.currentPage ? 'page' : undefined"
                    :aria-label="`第 ${item} 頁`"
                  >
                    {{ item }}
                  </button>
                </template>

                <button
                  @click="goToPage(productStore.currentPage + 1)"
                  :disabled="!productStore.hasNextPage"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="下一頁"
                >
                  <PhCaretRight :size="16" weight="bold" />
                </button>
                <button
                  @click="goToPage(productStore.totalPages)"
                  :disabled="!productStore.hasNextPage"
                  class="hidden h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
                  aria-label="最後一頁"
                >
                  <PhCaretDoubleRight :size="16" weight="bold" />
                </button>
              </div>

              <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <p class="font-mono text-xs text-steel-400">
                  第 {{ productStore.currentPage }} / {{ productStore.totalPages }} 頁 · 共 {{ productStore.totalItems }} 件
                </p>

                <!-- 頁數多到出現省略號時才給跳頁框；頁數少時逐頁點就夠，多一個輸入框只是噪音 -->
                <form
                  v-if="productStore.totalPages > PAGE_WINDOW_MAX"
                  @submit.prevent="submitJump"
                  class="flex items-center gap-2 font-mono text-xs text-steel-500"
                >
                  <label for="jump-page">跳至</label>
                  <input
                    id="jump-page"
                    v-model="jumpInput"
                    type="number"
                    min="1"
                    :max="productStore.totalPages"
                    inputmode="numeric"
                    class="h-9 w-16 rounded-full border border-steel-200 bg-white px-3 text-center text-sm text-steel-900 transition-colors focus:border-steel-900 focus:outline-none"
                    :aria-label="`跳至指定頁，1 到 ${productStore.totalPages}`"
                  />
                  <span>頁</span>
                  <button
                    type="submit"
                    class="h-9 rounded-full bg-steel-900 px-4 font-display text-xs font-semibold text-white transition-colors hover:bg-brand-500"
                  >
                    前往
                  </button>
                </form>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/product'
import { useCategoryStore } from '../stores/category'
import Navbar from '../components/Navbar.vue'
import ProductCard from '../components/ProductCard.vue'
import Footer from '../components/Footer.vue'
import { PhCaretRight, PhCaretLeft, PhCaretDoubleLeft, PhCaretDoubleRight, PhX, PhPackage } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const categorySlug = computed(() => route.query.category || '')
const searchKeyword = computed(() => route.query.search || '')

const currentCategory = computed(() => {
  if (!categorySlug.value) return ''
  return categoryStore.getCategoryNameBySlug(categorySlug.value)
})

const categoryTree = computed(() => categoryStore.categoryTree)

const breadcrumbs = computed(() => {
  if (!categorySlug.value) return []
  return categoryStore.getCategoryBreadcrumb(categorySlug.value)
})

// 分頁按鈕：首末頁永遠顯示，中間視窗跟著目前頁走，斷開處補省略號。
// PAGE_WINDOW_MAX 是「不省略就全部列出」的上限，也是最多會出現的按鈕數：
// 1 + … + (current-1, current, current+1) + … + total = 7 顆，寬度不會亂跳。
const ELLIPSIS = '…'
const PAGE_WINDOW_MAX = 7      // 桌機：不省略就全列出的上限，也是最多出現的項目數
const PAGE_WINDOW_MIN = 5      // 手機：40px 按鈕排 7 顆會折行，收到 5 顆才排得下一列

// 手機另用較窄的視窗。純視覺調整，故用 matchMedia 而非在 template 塞 hidden/block，
// 後者會讓兩套按鈕同時存在於 DOM，鍵盤 Tab 與螢幕閱讀器都會讀到兩份。
const isCompact = ref(false)
let mq = null
const onMqChange = (e) => { isCompact.value = e.matches }

const pageItems = computed(() => {
  const total = productStore.totalPages
  const current = productStore.currentPage
  const max = isCompact.value ? PAGE_WINDOW_MIN : PAGE_WINDOW_MAX
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const edgeRun = max - 2   // 頭/尾形態的連續頁數（首或末頁 + 省略號佔掉 2 格）
  const midRun = max - 4    // 中段形態的連續頁數（首末頁 + 兩個省略號佔掉 4 格）

  // 靠近頭尾時把視窗往內展開，而不是讓它被邊界截短。
  // 否則在第 1 頁只會得到「1 2 … 20」，看得到的頁數反而比停在中間時少。
  // 三種形態的項目數都等於 max，按鈕列寬度不會隨翻頁跳動。
  let items
  if (current <= edgeRun - 1) {
    items = [...range(1, edgeRun), ELLIPSIS, total]
  } else if (current >= total - edgeRun + 2) {
    items = [1, ELLIPSIS, ...range(total - edgeRun + 1, total)]
  } else {
    const before = Math.floor((midRun - 1) / 2)
    items = [1, ELLIPSIS, ...range(current - before, current - before + midRun - 1), ELLIPSIS, total]
  }

  // 省略號只藏住一頁時直接把那頁印出來 —— 「1 … 3」比「1 2 3」還難用，且一樣寬
  return items.map((it, i) =>
    it === ELLIPSIS && items[i + 1] - items[i - 1] === 2 ? items[i - 1] + 1 : it
  )
})

// 跳頁輸入框
const jumpInput = ref('')
const submitJump = () => {
  const page = Number(jumpInput.value)
  if (!Number.isInteger(page)) return
  // 夾在有效範圍內：使用者打 999 就跳到最後一頁，而不是靜靜地什麼都沒發生
  goToPage(Math.min(Math.max(page, 1), productStore.totalPages))
  jumpInput.value = ''
}

const fetchFilteredProducts = async (page = 1) => {
  await productStore.fetchProducts(page, {
    categorySlug: categorySlug.value,
    keyword: searchKeyword.value,
  })
}

const goToPage = (page) => {
  if (page >= 1 && page <= productStore.totalPages) {
    fetchFilteredProducts(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const clearFilters = () => {
  router.push('/products')
}

watch(() => [route.query.category, route.query.search], () => {
  fetchFilteredProducts(1)
}, { immediate: false })

onMounted(async () => {
  // Tailwind sm 斷點是 640px，這裡的 639px 對應「未達 sm」
  mq = window.matchMedia('(max-width: 639px)')
  isCompact.value = mq.matches
  mq.addEventListener('change', onMqChange)

  await categoryStore.fetchCategories()
  fetchFilteredProducts(1)
})

onUnmounted(() => mq?.removeEventListener('change', onMqChange))
</script>
