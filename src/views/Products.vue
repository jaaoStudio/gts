<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar />
    
    <main class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar (Desktop) -->
        <aside class="w-full lg:w-64 flex-shrink-0 hidden lg:block">
          <div class="sticky top-24 space-y-8">
            <!-- Categories -->
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">商品分類</h3>
              <ul class="space-y-3">
                <li>
                  <router-link 
                    to="/products" 
                    class="block text-sm font-medium transition-colors"
                    :class="!categorySlug ? 'text-brand-primary' : 'text-slate-600 dark:text-slate-400 hover:text-brand-primary'"
                  >
                    所有商品
                  </router-link>
                </li>
                
                <li v-for="cat in categoryTree" :key="cat.id">
                  <!-- Parent -->
                  <router-link 
                    :to="{ path: '/products', query: { category: cat.slug } }"
                    class="block text-sm font-medium transition-colors"
                    :class="categorySlug === cat.slug ? 'text-brand-primary' : 'text-slate-600 dark:text-slate-400 hover:text-brand-primary'"
                  >
                    {{ cat.name }}
                  </router-link>

                  <!-- Children -->
                  <ul v-if="cat.children && cat.children.length > 0" class="mt-2 ml-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                    <li v-for="child in cat.children" :key="child.id">
                      <router-link 
                        :to="{ path: '/products', query: { category: child.slug } }"
                        class="block text-sm transition-colors"
                        :class="categorySlug === child.slug ? 'text-brand-primary font-medium' : 'text-slate-500 dark:text-slate-500 hover:text-brand-primary'"
                      >
                        {{ child.name }}
                      </router-link>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <div class="flex-1">
          <!-- Breadcrumb / Filter Info -->
          <div class="mb-8">
            <!-- Mobile Category Filter (Horizontal Scroll) -->
            <div class="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
              <div class="flex gap-2">
                <router-link 
                  to="/products"
                  class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  :class="!categorySlug ? 'bg-brand-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'"
                >
                  所有商品
                </router-link>
                <router-link 
                  v-for="cat in categoryTree"
                  :key="cat.id"
                  :to="{ path: '/products', query: { category: cat.slug } }"
                  class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  :class="categorySlug === cat.slug ? 'bg-brand-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'"
                >
                  {{ cat.name }}
                </router-link>
              </div>
            </div>

            <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4 flex-wrap">
              <router-link to="/" class="hover:text-brand-primary transition-colors">首頁</router-link>
              <span>›</span>
              <router-link 
                to="/products" 
                class="hover:text-brand-primary transition-colors"
                :class="{ 'text-slate-900 dark:text-white font-medium': !categorySlug && !searchKeyword }"
              >
                所有商品
              </router-link>
              
              <template v-if="categorySlug">
                <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
                  <span>›</span>
                  <router-link 
                    :to="{ path: '/products', query: { category: crumb.slug } }"
                    class="hover:text-brand-primary transition-colors"
                    :class="{ 'text-slate-900 dark:text-white font-medium': index === breadcrumbs.length - 1 }"
                  >
                    {{ crumb.name }}
                  </router-link>
                </template>
              </template>
              
              <template v-else-if="searchKeyword">
                <span>›</span>
                <span class="text-slate-900 dark:text-white font-medium">搜尋與「{{ searchKeyword }}」相關的結果</span>
              </template>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                <span v-if="categorySlug">{{ currentCategory }}</span>
                <span v-else-if="searchKeyword">搜尋：{{ searchKeyword }}</span>
                <span v-else>所有商品</span>
              </h1>
              
              <!-- Clear filters -->
              <button 
                v-if="categorySlug || searchKeyword"
                @click="clearFilters"
                class="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-primary border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
              >
                清除篩選
              </button>
            </div>

            <p v-if="productStore.totalItems > 0" class="mt-3 text-slate-600 dark:text-slate-400">
              共 {{ productStore.totalItems }} 件商品
            </p>
          </div>
          
          <div v-if="productStore.loading" class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          </div>
          
          <div v-else-if="productStore.error" class="text-center text-red-500 py-10">
            {{ productStore.error }}
          </div>
          
          <div v-else-if="productStore.products.length === 0" class="text-center py-16">
            <svg class="w-24 h-24 mx-auto text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">找不到商品</h3>
            <p class="text-slate-600 dark:text-slate-400 mb-6">
              <span v-if="searchKeyword">搜尋「{{ searchKeyword }}」沒有找到相關商品</span>
              <span v-else-if="categorySlug">此分類目前沒有商品</span>
              <span v-else>目前沒有可顯示的商品</span>
            </p>
            <router-link 
              to="/products" 
              class="inline-block px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              瀏覽所有商品
            </router-link>
          </div>
          
          <div v-else>
            <!-- 商品列表 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <ProductCard 
                v-for="product in productStore.products" 
                :key="product.id" 
                :product="product" 
              />
            </div>

            <!-- 分頁控制 -->
            <div v-if="productStore.totalPages > 1" class="flex flex-col items-center gap-6 mt-16">
              <div class="flex items-center gap-4">
                <button
                  @click="goToPage(productStore.currentPage - 1)"
                  :disabled="!productStore.hasPrevPage"
                  class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white"
                >
                  上一頁
                </button>

                <div class="flex gap-2">
                  <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="goToPage(page)"
                    :class="[
                      'px-4 py-2 rounded-lg transition-colors',
                      page === productStore.currentPage
                        ? 'bg-brand-primary text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                    ]"
                  >
                    {{ page }}
                  </button>
                </div>

                <button
                  @click="goToPage(productStore.currentPage + 1)"
                  :disabled="!productStore.hasNextPage"
                  class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white"
                >
                  下一頁
                </button>
              </div>

              <div class="text-center text-sm text-slate-600 dark:text-slate-400">
                第 {{ productStore.currentPage }} / {{ productStore.totalPages }} 頁
              </div>
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

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

// Current filters from URL
const categorySlug = computed(() => route.query.category || '')
const searchKeyword = computed(() => route.query.search || '')

// Look up category name by slug (using store getter)
const currentCategory = computed(() => {
  if (!categorySlug.value) return ''
  return categoryStore.getCategoryNameBySlug(categorySlug.value)
})

const categoryTree = computed(() => categoryStore.categoryTree)

const breadcrumbs = computed(() => {
  if (!categorySlug.value) return []
  return categoryStore.getCategoryBreadcrumb(categorySlug.value)
})

// 計算要顯示的頁碼（最多顯示 5 個）
const visiblePages = computed(() => {
  const current = productStore.currentPage
  const total = productStore.totalPages
  const delta = 2
  
  let pages = []
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i)
  }
  
  return pages
})

// Fetch products based on filters
const fetchFilteredProducts = async (page = 1) => {
  await productStore.fetchProducts(page, {
    categorySlug: categorySlug.value,
    keyword: searchKeyword.value
  })
}

// Page navigation
const goToPage = (page) => {
  if (page >= 1 && page <= productStore.totalPages) {
    fetchFilteredProducts(page)
  }
}

// Clear all filters
const clearFilters = () => {
  router.push('/products')
}

// Watch for URL query changes
watch(() => [route.query.category, route.query.search], () => {
  fetchFilteredProducts(1)
}, { immediate: false })

// Initial fetch
onMounted(async () => {
  // Ensure categories are loaded (will use cache if already loaded)
  await categoryStore.fetchCategories()
  fetchFilteredProducts(1)
})
</script>
