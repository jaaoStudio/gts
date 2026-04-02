<template>
  <div class="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center" ref="heroContainer">
    <!-- Background Image with Parallax -->
    <GridDistortion
      :imageSrc="heroImage"
      :grid="10"
      :mouse="0.1"
      :strength="0.15"
      :relaxation="0.9"
      className="absolute inset-0 z-0 bg-cover bg-center grayscale-[0.9]"
    />

    <!-- Content -->
    <div class="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
         :style="{ transform: `translateY(${offset * 0.2}px)` }">
      <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-6 animate-fade-in-up">
        專鑄品質・<span class="text-brand-primary">穩健施工 </span>
      </h1>
      <p class="mt-4 text-xl sm:text-2xl text-gray-200 max-w-3xl mx-auto mb-10 animate-fade-in-up delay-100">
        供應各式測量畫線、手工具、工安防護及五金配件<br>提供您最可靠的選擇
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
        <button class="px-8 py-4 bg-brand-primary hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg transform hover:-translate-y-1 transition-all duration-300 text-lg">
          立即選購
        </button>
        <button class="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 font-bold rounded-lg shadow-lg transform hover:-translate-y-1 transition-all duration-300 text-lg">
          查看目錄
        </button>
      </div>
    </div>
    
    <!-- Scroll Indicator -->
    <div class="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white/80 z-20">

      <div class="animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import GridDistortion from "./GridDistortion.vue";
import heroImage from '@/assets/joaolimafotografias-sand-4753305.jpg';

const offset = ref(0)
const heroContainer = ref(null)

const handleScroll = () => {
  offset.value = window.pageYOffset
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

.delay-100 {
  animation-delay: 0.2s;
}

.delay-200 {
  animation-delay: 0.4s;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
