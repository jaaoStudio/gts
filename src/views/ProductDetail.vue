<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar />
    
    <main class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center h-96">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
      
      <!-- Error / Not Found -->
      <div v-else-if="error || !product" class="text-center py-20">
        <svg class="w-24 h-24 mx-auto text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">找不到商品</h2>
        <p class="text-slate-600 dark:text-slate-400 mb-6">此商品可能已下架或不存在</p>
        <router-link to="/products" class="inline-block px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-orange-600 transition-colors">
          瀏覽所有商品
        </router-link>
      </div>
      
      <!-- Product Content -->
      <div v-else>
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6 flex-wrap">
          <router-link to="/" class="hover:text-brand-primary transition-colors">首頁</router-link>
          <span>›</span>
          <router-link to="/products" class="hover:text-brand-primary transition-colors">所有商品</router-link>
          
          <template v-if="breadcrumbs.length > 0">
            <template v-for="crumb in breadcrumbs" :key="crumb.id">
              <span>›</span>
              <router-link 
                :to="`/products?category=${crumb.slug}`"
                class="hover:text-brand-primary transition-colors"
              >
                {{ crumb.name }}
              </router-link>
            </template>
          </template>
          
          <span>›</span>
          <span class="text-slate-900 dark:text-white font-medium">{{ product.name }}</span>
        </div>

        <!-- Product Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <!-- Left: Product Image -->
          <div class="relative flex flex-col gap-4">
            <!-- Main Image -->
            <div class="aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg">
              <img 
                :src="activeImage || '/placeholder.jpg'" 
                :alt="product.name"
                class="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>
            
            <!-- Gallery Thumbnails -->
            <div v-if="galleryImages.length > 1" class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
               <button 
                 v-for="(img, index) in galleryImages" 
                 :key="index"
                 @click="activeImage = img"
                 class="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all"
                 :class="activeImage === img ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-brand-primary/50'"
               >
                  <img :src="img" class="w-full h-full object-cover" />
               </button>
            </div>

            <!-- Tags -->
            <div v-if="productTags.length > 0" class="absolute top-4 left-4 flex flex-wrap gap-2">
              <span 
                v-for="tag in productTags" 
                :key="tag.id"
                class="px-3 py-1 text-sm font-medium rounded-full text-white shadow-md backdrop-blur-sm"
                :style="{ backgroundColor: tag.color || '#f97316' }"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>

          <!-- Right: Product Info -->
          <div class="flex flex-col">
            <!-- Product Name -->
            <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {{ product.name }}
            </h1>

            <!-- Short Description -->
            <p v-if="product.short_description" class="text-lg text-slate-600 dark:text-slate-400 mb-6">
              {{ product.short_description }}
            </p>

            <!-- Price Display -->
            <div class="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 mb-6">
              <div class="flex items-baseline gap-2 mb-2">
                <span class="text-sm text-slate-500 dark:text-slate-400">價格</span>
              </div>
              <div class="text-3xl font-bold text-brand-primary">
                {{ selectedVariant ? `$${selectedVariant.price.toLocaleString()}` : priceDisplay }}
              </div>
            </div>

            <!-- Variants Selection -->
            <div v-if="publishedVariants.length > 1" class="mb-6">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                選擇規格
              </label>
              <div class="flex flex-wrap gap-3">
                <button
                  v-for="variant in publishedVariants"
                  :key="variant.id"
                  @click="selectedVariant = variant"
                  :class="[
                    'px-4 py-3 rounded-lg border-2 transition-all',
                    selectedVariant?.id === variant.id
                      ? 'border-brand-primary bg-orange-50 dark:bg-orange-900/20 text-brand-primary'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-primary'
                  ]"
                >
                  <div class="font-medium">{{ variant.spec_name }}</div>
                  <div class="text-sm text-slate-500 dark:text-slate-400">${{ variant.price.toLocaleString() }}</div>
                </button>
              </div>
            </div>

            <!-- Stock Status -->
            <div v-if="selectedVariant" class="mb-6">
              <span 
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                  selectedVariant.stock > 0 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                ]"
              >
                <span class="w-2 h-2 rounded-full" :class="selectedVariant.stock > 0 ? 'bg-green-500' : 'bg-red-500'"></span>
                {{ selectedVariant.stock > 0 ? `庫存 ${selectedVariant.stock} 件` : '暫時缺貨' }}
              </span>
            </div>

            <!-- Contact Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
              <a 
                href="tel:0800123456"
                class="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                電話詢價
              </a>
              <a 
                href="https://line.me/ti/p/~your-line-id"
                target="_blank"
                class="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.135-.033.195-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                LINE 詢問
              </a>
            </div>
          </div>
        </div>

        <!-- Product Description -->
        <div v-if="product.description" class="mt-16">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">商品介紹</h2>
          <div 
            class="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm"
            v-html="product.description"
          ></div>
        </div>
      </div>
    </main>
    
    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { productService } from '../services/productService'
import { useCategoryStore } from '../stores/category'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'

const route = useRoute()
const categoryStore = useCategoryStore()

// State
const product = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedVariant = ref(null)
const activeImage = ref('')

// Computed
const galleryImages = computed(() => {
  if (!product.value) return []
  const imgs = []
  
  if (product.value.image) {
    imgs.push(product.value.image)
  }
  
  if (product.value.gallery && Array.isArray(product.value.gallery)) {
    imgs.push(...product.value.gallery)
  }
  
  return [...new Set(imgs)]
})

const productTags = computed(() => {
  if (!product.value?.tags) return []
  return product.value.tags
    .map(t => t.tags_id)
    .filter(tag => tag !== null)
})

const publishedVariants = computed(() => {
  if (!product.value?.variants) return []
  return product.value.variants
})

const priceDisplay = computed(() => {
  if (publishedVariants.value.length === 0) return '詢問價格'
  
  const prices = publishedVariants.value.map(v => v.price).filter(p => p !== null)
  if (prices.length === 0) return '詢問價格'
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  
  if (min === max) {
    return `$${min.toLocaleString()}`
  }
  return `$${min.toLocaleString()} - $${max.toLocaleString()}`
})

const breadcrumbs = computed(() => {
  if (!product.value) return []
  
  // 收集所有相關分類 (包含主分類和多重分類)
  const candidates = []
  if (product.value.category) candidates.push(product.value.category)
  if (product.value.categories && Array.isArray(product.value.categories)) {
    candidates.push(...product.value.categories)
  }
  
  // 去除重複 (依照 slug)
  const uniqueCandidates = [...new Map(candidates.map(c => [c.slug, c])).values()]
  
  if (uniqueCandidates.length === 0) return []
  
  // 找出路徑最長的分類 (也就是最深層的子分類)
  let longestPath = []
  
  uniqueCandidates.forEach(cat => {
    const path = categoryStore.getCategoryBreadcrumb(cat.slug)
    if (path.length > longestPath.length) {
      longestPath = path
    }
  })
  
  return longestPath
})

// Fetch product
const fetchProduct = async (slug) => {
  loading.value = true
  error.value = null
  
  try {
    const data = await productService.getProductBySlug(slug)
    product.value = data
    
    // Set initial image
    if (data.image) {
      activeImage.value = data.image
    }

    // Auto-select first published variant
    if (publishedVariants.value.length > 0) {
      selectedVariant.value = publishedVariants.value[0]
    }
  } catch (err) {
    error.value = 'Failed to load product'
    console.error(err)
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => route.params.slug, (newSlug) => {
  if (newSlug) {
    fetchProduct(newSlug)
  }
}, { immediate: false })

// When variant changes, update image if variant has one
watch(selectedVariant, (newVal) => {
  if (newVal && newVal.image) {
    activeImage.value = newVal.image
  } else if (product.value && product.value.image) {
    // Revert to main image if variant has no specific image or if we switch back
    activeImage.value = product.value.image
  }
})

// Initial fetch
onMounted(() => {
  categoryStore.fetchCategories() // Ensure categories are loaded for breadcrumbs
  if (route.params.slug) {
    fetchProduct(route.params.slug)
  }
})
</script>

<style scoped>
/* Prose styles for rich text content */
.prose :deep(img) {
  @apply rounded-lg shadow-md;
}

.prose :deep(table) {
  @apply w-full border-collapse;
}

.prose :deep(th),
.prose :deep(td) {
  @apply border border-slate-300 dark:border-slate-700 px-4 py-2;
}
</style>
