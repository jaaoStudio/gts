<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar @navigate="scrollToSection" />
    
    <main>
      <HeroParallax id="home" />
      
      <section id="products" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">精選商品</h2>
          <div class="w-24 h-1 bg-brand-primary mx-auto rounded-full"></div>
          <p class="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            探索我們精選的優質工具，專為性能和耐用性而設計。
          </p>
        </div>
        
        <div v-if="productStore.loading" class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
        
        <div v-else-if="productStore.error" class="text-center text-red-500 py-10">
          {{ productStore.error }}
        </div>
        
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <ProductCard 
            v-for="product in productStore.products" 
            :key="product.id" 
            :product="product" 
          />
        </div>
        
        <div class="mt-16 text-center">
          <button class="px-8 py-3 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-bold rounded-lg transition-all duration-300">
            查看所有商品
          </button>
        </div>
      </section>
      
      <!-- Features Section -->
      <section class="py-20 bg-white dark:bg-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div class="text-center p-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300">
              <div class="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">優良品質</h3>
              <p class="text-slate-500 dark:text-slate-400">
                來自全球最佳製造商，確保耐用性和精確度。
              </p>
            </div>
            
            <div class="text-center p-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300">
              <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">快速出貨</h3>
              <p class="text-slate-500 dark:text-slate-400">
                下午 2 點前下單當日出貨。訂單滿 $100 免運費。
              </p>
            </div>
            
            <div class="text-center p-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">終身保固</h3>
              <p class="text-slate-500 dark:text-slate-400">
                我們對產品負責。大多數手動工具均享有終身保固。
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Newsletter Section -->
      <section class="py-20 bg-brand-secondary relative overflow-hidden">
        <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div class="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6">加入專業會員</h2>
          <p class="text-slate-300 mb-8 text-lg">
            獲取新產品發布的獨家訪問權、專業提示和會員專屬折扣。
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <input type="email" placeholder="輸入您的電子郵件" class="flex-1 px-6 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-slate-900" />
            <button class="px-8 py-4 bg-brand-primary hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg transition-colors duration-300">
              註冊
            </button>
          </div>
        </div>
      </section>
    </main>
    
    <Footer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useProductStore } from '../stores/product'
import Navbar from '../components/Navbar.vue'
import HeroParallax from '../components/HeroParallax.vue'
import ProductCard from '../components/ProductCard.vue'
import Footer from '../components/Footer.vue'

const productStore = useProductStore()

onMounted(() => {
  productStore.fetchProducts()
})

const scrollToSection = (sectionId) => {
  if (sectionId === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>
