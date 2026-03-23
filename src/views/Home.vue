<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar />
    
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
          <button @click="goToProducts" class="px-8 py-3 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-bold rounded-lg transition-all duration-300">
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
      
      <!-- CTA Section -->
      <section class="py-20 bg-brand-secondary relative overflow-hidden">
        <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div class="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <template v-if="!authStore.isAuthenticated">
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6">加入會員</h2>
            <p class="text-slate-300 mb-8 text-lg">
              使用 Google 帳號快速登入，享受會員專屬服務與優惠。
            </p>
            <router-link
              to="/login"
              class="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </router-link>
          </template>
          <template v-else>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6">歡迎回來！</h2>
            <p class="text-slate-300 mb-8 text-lg">
              {{ authStore.userName }}，感謝您的支持。探索更多優質商品吧！
            </p>
            <router-link
              to="/products"
              class="inline-block px-8 py-4 bg-brand-primary hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg transition-colors duration-300"
            >
              瀏覽商品
            </router-link>
          </template>
        </div>
      </section>
    </main>
    
    <Footer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/product'
import { useAuthStore } from '../stores/auth'
import Navbar from '../components/Navbar.vue'
import HeroParallax from '../components/HeroParallax.vue'
import ProductCard from '../components/ProductCard.vue'
import Footer from '../components/Footer.vue'

const router = useRouter()
const productStore = useProductStore()
const authStore = useAuthStore()

onMounted(() => {
  productStore.fetchFeaturedProducts()
  authStore.init()
})



const goToProducts = () => {
  router.push('/products')
}
</script>
