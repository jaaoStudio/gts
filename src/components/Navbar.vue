<template>
  <nav class="fixed w-full z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex-shrink-0 flex items-center cursor-pointer" @click="$emit('navigate', 'home')">
          <span class="text-2xl font-bold bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
            GTS
          </span>
        </div>
        <div class="hidden md:flex space-x-8">
          <a href="#" class="text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary transition-colors font-medium">商品專區</a>
          <a href="#" class="text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary transition-colors font-medium">優惠活動</a>
          <a href="#" class="text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary transition-colors font-medium">服務項目</a>
          <a href="#" class="text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary transition-colors font-medium">聯絡我們</a>
        </div>
        <div class="flex items-center space-x-4">
          <button class="p-2 text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button class="p-2 text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-brand-primary rounded-full">0</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
defineEmits(['navigate'])
</script>
