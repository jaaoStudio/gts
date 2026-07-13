<template>
  <router-link
    :to="`/product/${product.slug}`"
    class="group relative flex h-full flex-col rounded-[1.6rem] bg-white p-1.5 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(16,17,21,0.22)] hover:ring-steel-900/10"
  >
    <!-- Inner core (concentric radius) -->
    <div class="flex flex-1 flex-col overflow-hidden rounded-[1.15rem] bg-steel-50">
      <!-- Image -->
      <div class="relative aspect-[4/5] w-full shrink-0 overflow-hidden">
        <img
          :src="product.image || placeholder"
          :alt="product.name"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.06]"
        />
        <!-- Badge -->
        <span
          v-if="product.badge"
          class="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur"
          :style="{ backgroundColor: product.badgeColor || '#101115' }"
        >
          {{ product.badge }}
        </span>
      </div>

      <!-- Content -->
      <div class="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
        <div v-if="product.category?.name" class="font-mono text-[11px] uppercase tracking-[0.16em] text-steel-400">
          {{ product.category.name }}
        </div>

        <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug text-steel-900 transition-colors duration-300 group-hover:text-brand-600">
          {{ product.name }}
        </h3>

        <p v-if="product.short_description" class="line-clamp-2 text-sm leading-relaxed text-steel-500">
          {{ product.short_description }}
        </p>

        <div class="mt-auto flex items-end justify-between border-t border-steel-100 pt-4">
          <div class="flex flex-col">
            <span class="font-mono text-lg font-semibold tracking-tight text-steel-900">
              {{ product.price > 0 ? `NT$${product.price.toLocaleString()}` : '詢價' }}
            </span>
            <span class="text-[11px] text-steel-400">起</span>
          </div>
          <!-- Button-in-button trailing icon -->
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-steel-100 text-steel-700 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-brand-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          >
            <PhArrowUpRight :size="18" weight="bold" />
          </span>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { PhArrowUpRight } from '@phosphor-icons/vue'

defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const placeholder = 'https://picsum.photos/seed/gts-tool/800/1000'
</script>
