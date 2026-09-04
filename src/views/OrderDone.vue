<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <div class="rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-8 text-center sm:p-12">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <PhCheckCircle :size="34" weight="fill" class="text-emerald-500" />
        </div>

        <h1 class="mt-6 font-display text-2xl font-bold tracking-tight text-steel-900 sm:text-3xl">
          訂購單已送出
        </h1>

        <div class="mt-6 rounded-2xl bg-steel-50 px-6 py-5">
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">訂購單號</p>
          <p class="mt-1.5 font-mono text-xl font-bold tracking-tight text-steel-900">
            {{ orderNumber || '產生中…' }}
          </p>
        </div>

        <p class="mt-6 leading-relaxed text-steel-600">
          我們會盡快與您確認價格與庫存，確認後會通知您應付金額與匯款方式。
          <span class="font-semibold text-steel-800">確認前不需要先付款。</span>
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <router-link
            to="/account/orders"
            class="flex flex-1 items-center justify-center gap-2 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
          >
            查看我的訂購單
          </router-link>
          <router-link
            to="/products"
            class="flex flex-1 items-center justify-center gap-2 rounded-full border border-steel-300 px-6 py-4 font-display text-base font-semibold text-steel-800 transition-colors duration-300 hover:border-steel-900"
          >
            繼續挑選
          </router-link>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { orderService } from '../services/orderService'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { PhCheckCircle } from '@phosphor-icons/vue'

const route = useRoute()
const orderNumber = ref(null)

onMounted(async () => {
  // 單號由 items.create 的 action flow 事後補上，此頁再輪詢一次。
  // 取不到也不擋——訂單確實已建立，客人可從「我的訂購單」看到。
  try {
    orderNumber.value = await orderService.waitForOrderNumber(route.params.id)
  } catch (err) {
    console.error('Error fetching order number:', err)
  }
})
</script>
