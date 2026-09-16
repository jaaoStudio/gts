<template>
  <span
    class="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
    :class="tone.wrapper"
  >
    <span class="h-2 w-2 rounded-full" :class="tone.dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { orderStatusCopy } from '../services/orderService'

const props = defineProps({
  status: { type: String, required: true },
  // 超商取貨付款單的 quoted 是「已確認」而不是「待付款」——客人不必匯款
  deliveryMethod: { type: String, default: null },
})

// 與 Directus 後台的狀態顏色對齊，讓客人和老闆看到的是同一套語意
const TONES = {
  pending: { wrapper: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
  quoted: { wrapper: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
  paid: { wrapper: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  shipped: { wrapper: 'bg-steel-900 text-white', dot: 'bg-white' },
  cancelled: { wrapper: 'bg-steel-100 text-steel-400', dot: 'bg-steel-300' },
}

const label = computed(
  () => orderStatusCopy(props.status, props.deliveryMethod)?.label || props.status
)
const tone = computed(() => TONES[props.status] || TONES.pending)
</script>
