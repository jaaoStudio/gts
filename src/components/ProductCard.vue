<template>
  <div class="group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col h-full">
    <!-- Image -->
    <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8 relative">
      <img 
        :src="product.image" 
        :alt="product.name" 
        class="h-64 w-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
      />
      <div 
        class="absolute top-4 right-4 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm"
        :class="[
          product.badgeColor ? 'text-white' : 'bg-white/90 dark:bg-slate-900/90 text-brand-secondary dark:text-white'
        ]"
        :style="product.badgeColor ? { backgroundColor: product.badgeColor } : {}"
        v-if="product.badge"
      >
        {{ product.badge }}
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-6 flex-1 flex flex-col">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-primary transition-colors">
        {{ product.name }}
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 flex-1">
        {{ product.short_description }}
      </p>
      
      <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
        <div class="flex flex-col">
          <span class="text-xs text-slate-400">Price</span>
          <span class="text-xl font-bold text-brand-primary">${{ product.price }}</span>
        </div>
        <button class="p-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-brand-primary hover:text-white transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  product: {
    type: Object,
    required: true
  }
})
</script>
