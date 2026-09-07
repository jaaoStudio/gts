<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">會員專區</p>
          <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
            我的訂購單
          </h1>
        </div>
        <router-link
          to="/account"
          class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500 transition-colors hover:text-steel-900"
        >
          帳戶資訊
        </router-link>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="mt-10 space-y-4">
        <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-[1.5rem] bg-steel-100" />
      </div>

      <div
        v-else-if="error"
        class="mt-10 rounded-2xl border border-steel-200 bg-white py-20 text-center text-steel-500"
      >
        {{ error }}
      </div>

      <div
        v-else-if="orders.length === 0"
        class="mt-10 rounded-[1.5rem] border border-steel-200 bg-white py-20 text-center"
      >
        <p class="text-steel-500">還沒有任何訂購單。</p>
        <router-link
          to="/products"
          class="mt-6 inline-flex items-center gap-2 rounded-full bg-steel-900 px-6 py-3.5 font-display text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
        >
          去挑選商品 <PhArrowRight :size="16" weight="bold" />
        </router-link>
      </div>

      <ul v-else class="mt-10 space-y-4">
        <li v-for="order in orders" :key="order.id">
          <router-link
            :to="{ name: 'OrderDetail', params: { id: order.id } }"
            class="group flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-steel-300"
          >
            <div class="min-w-0 flex-1">
              <p class="font-mono text-sm font-bold text-steel-900">
                {{ order.order_number || `#${order.id}` }}
              </p>
              <p class="mt-1 text-sm text-steel-500">
                {{ formatDate(order.date_created) }} · {{ order.items.length }} 項
              </p>
            </div>

            <OrderStatusChip :status="order.status" />

            <div class="text-right">
              <p class="font-mono text-lg font-bold text-steel-900">{{ amountLabel(order) }}</p>
              <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-steel-400">
                {{ order.confirmed_total != null ? '應付金額' : '參考小計' }}
              </p>
            </div>

            <PhCaretRight
              :size="18"
              weight="bold"
              class="text-steel-300 transition-colors group-hover:text-steel-900"
            />
          </router-link>
        </li>
      </ul>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { orderService } from '../services/orderService'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import OrderStatusChip from '../components/OrderStatusChip.vue'
import { PhArrowRight, PhCaretRight } from '@phosphor-icons/vue'

const orders = ref([])
const loading = ref(true)
const error = ref(null)

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })

// 老闆確認後才有應付金額；在那之前只能顯示送出時的參考小計
const amountLabel = (order) => {
  const value = order.confirmed_total ?? order.subtotal
  if (value == null) return '待報價'
  return `NT$${value.toLocaleString()}`
}

onMounted(async () => {
  try {
    // 權限已在 Directus 端以 customer.user_id = $CURRENT_USER 過濾，只會拿到自己的單
    orders.value = await orderService.getMyOrders()
  } catch (err) {
    error.value = '無法載入訂購單，請稍後再試。'
    console.error('Error loading orders:', err)
  } finally {
    loading.value = false
  }
})
</script>
