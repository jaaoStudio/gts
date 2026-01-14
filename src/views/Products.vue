<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar />
    
    <main class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">所有商品</h2>
        <div class="w-24 h-1 bg-brand-primary mx-auto rounded-full"></div>
        <p v-if="productStore.totalItems > 0" class="mt-4 text-slate-600 dark:text-slate-400">
          共 {{ productStore.totalItems }} 件商品
        </p>
      </div>
      
      <div v-if="productStore.loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
      
      <div v-else-if="productStore.error" class="text-center text-red-500 py-10">
        {{ productStore.error }}
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
          <!-- 頁碼顯示 -->
          <div class="flex items-center gap-4">
            <button
              @click="productStore.prevPage()"
              :disabled="!productStore.hasPrevPage"
              class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white"
            >
              上一頁
            </button>

            <div class="flex gap-2">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="productStore.goToPage(page)"
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
              @click="productStore.nextPage()"
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
    </main>
    
    <Footer />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useProductStore } from '../stores/product'
import Navbar from '../components/Navbar.vue'
import ProductCard from '../components/ProductCard.vue'
import Footer from '../components/Footer.vue'

const productStore = useProductStore()

// 計算要顯示的頁碼（最多顯示 5 個）
const visiblePages = computed(() => {
  const current = productStore.currentPage
  const total = productStore.totalPages
  const delta = 2 // 前後各顯示幾頁
  
  let pages = []
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i)
  }
  
  return pages
})

onMounted(() => {
  productStore.fetchProducts(1)
})
</script>
