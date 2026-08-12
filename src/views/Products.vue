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
            <div v-if="productStore.totalPages > 1" class="mt-14 flex flex-col items-center gap-4">
              <div class="flex items-center gap-2">
                <button
                  @click="goToPage(productStore.currentPage - 1)"
                  :disabled="!productStore.hasPrevPage"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="上一頁"
                >
                  <PhCaretLeft :size="16" weight="bold" />
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  class="h-10 min-w-10 rounded-full px-3 font-mono text-sm font-medium transition-colors"
                  :class="page === productStore.currentPage ? 'bg-steel-900 text-white' : 'border border-steel-200 bg-white text-steel-700 hover:border-steel-900'"
                >
                  {{ page }}
                </button>
                <button
                  @click="goToPage(productStore.currentPage + 1)"
                  :disabled="!productStore.hasNextPage"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-steel-200 bg-white text-steel-700 transition-colors hover:border-steel-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="下一頁"
                >
                  <PhCaretRight :size="16" weight="bold" />
                </button>
              </div>
              <p class="font-mono text-xs text-steel-400">第 {{ productStore.currentPage }} / {{ productStore.totalPages }} 頁</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/product'
import { useCategoryStore } from '../stores/category'
import Navbar from '../components/Navbar.vue'
import ProductCard from '../components/ProductCard.vue'
import Footer from '../components/Footer.vue'
import { PhCaretRight, PhCaretLeft, PhX, PhPackage } from '@phosphor-icons/vue'

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

const visiblePages = computed(() => {
  const current = productStore.currentPage
  const total = productStore.totalPages
  const delta = 2
  const pages = []
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i)
  }
  return pages
})

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
  await categoryStore.fetchCategories()
  fetchFilteredProducts(1)
})
</script>
