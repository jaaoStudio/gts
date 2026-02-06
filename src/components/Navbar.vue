<template>
  <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        
        <!-- Logo -->
        <router-link to="/" class="flex-shrink-0 flex items-center group">
          <span class="text-2xl font-bold bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent group-hover:scale-105 transition-transform">
            GTS
          </span>
        </router-link>

        <!-- Desktop Menu -->
        <div class="hidden lg:flex items-center space-x-6">
          <!-- 商品分類 Dropdown -->
          <div class="relative group">
            <button class="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors font-medium py-2">
              商品專區
              <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <!-- Dropdown Menu -->
            <div class="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 max-h-[80vh] overflow-y-auto">
              <div class="py-2">
                <div v-for="category in categoryTree" :key="category.id">
                  <!-- Parent Category -->
                  <router-link 
                    :to="{ path: '/products', query: { category: category.slug } }"
                    class="block px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-primary transition-colors"
                  >
                    {{ category.name }}
                  </router-link>
                  
                  <!-- Children Categories -->
                  <div v-if="category.children && category.children.length > 0" class="bg-slate-50 dark:bg-slate-800/50">
                    <router-link 
                      v-for="child in category.children" 
                      :key="child.id"
                      :to="{ path: '/products', query: { category: child.slug } }"
                      class="block pl-8 pr-4 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {{ child.name }}
                    </router-link>
                  </div>
                </div>
                
                <div v-if="categoryTree.length === 0" class="px-4 py-2.5 text-sm text-slate-400">
                  載入中...
                </div>
              </div>
            </div>
          </div>

          <router-link to="/products" class="text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors font-medium">
            所有商品
          </router-link>
        </div>

        <!-- Search & Icons -->
        <div class="flex items-center space-x-3">
          <!-- Search Bar (Desktop) -->
          <div class="hidden md:flex relative">
            <input 
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text" 
              placeholder="搜尋商品..." 
              class="w-56 lg:w-64 px-4 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
            />
            <button 
              @click="handleSearch" 
              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-primary transition-colors"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <!-- Search Icon (Mobile) -->
          <button 
            @click="mobileSearchOpen = !mobileSearchOpen"
            class="md:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <!-- Cart Icon (Placeholder) -->
          <button class="relative p-2 text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="absolute -top-1 -right-1 bg-brand-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">0</span>
          </button>

          <!-- Mobile Menu Button -->
          <button 
            @click="mobileMenuOpen = !mobileMenuOpen" 
            class="lg:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-brand-primary transition-colors"
          >
            <svg v-if="!mobileMenuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Search Bar -->
      <div v-if="mobileSearchOpen" class="md:hidden py-3 border-t border-slate-200 dark:border-slate-800">
        <div class="relative">
          <input 
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text" 
            placeholder="搜尋商品..." 
            class="w-full px-4 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button 
            @click="handleSearch" 
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-primary"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileMenuOpen" class="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div class="px-4 py-3 space-y-1">
        <!-- All Products -->
        <router-link 
          to="/products" 
          @click="mobileMenuOpen = false"
          class="block px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary transition-colors"
        >
          所有商品
        </router-link>
        
        <!-- Categories -->
        <div class="pt-2 pb-1">
          <div class="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            商品分類
          </div>
          <div v-for="category in categoryTree" :key="category.id">
            <!-- Parent -->
            <router-link 
              :to="`/products?category=${category.slug}`"
              @click="mobileMenuOpen = false"
              class="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary transition-colors"
            >
              {{ category.name }}
            </router-link>
            <!-- Children -->
            <div v-if="category.children && category.children.length > 0" class="pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-3 my-1">
              <router-link 
                v-for="child in category.children" 
                :key="child.id"
                :to="`/products?category=${child.slug}`"
                @click="mobileMenuOpen = false"
                class="block px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary transition-colors"
              >
                {{ child.name }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '../stores/category'

const router = useRouter()
const categoryStore = useCategoryStore()

// State
const searchQuery = ref('')
const mobileMenuOpen = ref(false)
const mobileSearchOpen = ref(false)

// Categories from store
const categoryTree = computed(() => categoryStore.categoryTree)

// Fetch categories on mount
onMounted(() => {
  categoryStore.fetchCategories()
})

// Search handler
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    mobileMenuOpen.value = false
    mobileSearchOpen.value = false
    router.push({ 
      path: '/products', 
      query: { search: searchQuery.value.trim() } 
    })
  }
}
</script>
