<template>
  <router-link
    :to="`/product/${product.slug}`"
    class="block w-[204px] select-none rounded-[1.5rem] bg-white p-2 shadow-[0_30px_60px_-28px_rgba(16,17,21,0.45)] ring-1 ring-steel-900/[0.06] sm:w-[232px]"
    :aria-label="product.name"
  >
    <div class="overflow-hidden rounded-[1.05rem] bg-steel-100">
      <div class="relative aspect-[4/5] w-full">
        <img
          :src="product.image || placeholder"
          :alt="product.name"
          draggable="false"
          class="pointer-events-none h-full w-full object-cover"
        />
        <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-steel-950/75 to-transparent p-3">
          <p v-if="product.category?.name" class="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            {{ product.category.name }}
          </p>
          <p class="mt-0.5 line-clamp-1 font-display text-sm font-semibold text-white">{{ product.name }}</p>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between px-2.5 py-2">
      <span class="font-mono text-sm font-bold tracking-tight text-steel-900">
        {{ product.price > 0 ? `NT$${product.price.toLocaleString()}` : '詢價' }}
      </span>
      <span class="flex h-7 w-7 items-center justify-center rounded-full bg-steel-100 text-steel-700">
        <PhArrowUpRight :size="15" weight="bold" />
      </span>
    </div>
  </router-link>
</template>

<script setup>
import { PhArrowUpRight } from '@phosphor-icons/vue'
import placeholder from '@/assets/product-placeholder.svg'

defineProps({
  product: { type: Object, required: true },
})
</script>
