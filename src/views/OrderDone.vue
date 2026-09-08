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
          <p v-if="state === 'ready'" class="mt-1.5 font-mono text-xl font-bold tracking-tight text-steel-900">
            {{ orderNumber }}
          </p>
          <p v-else-if="state === 'loading'" class="mt-1.5 font-mono text-xl font-bold tracking-tight text-steel-900">
            產生中…
          </p>
          <p v-else class="mt-1.5 text-sm leading-relaxed text-steel-500">
            單號稍後產生，可到「我的訂購單」查看
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

// getOrderNumber() 內部是 catch { return null }，查詢失敗與「flow 還沒補上單號」
// 回傳同一個值。少了這個第三態，失敗時畫面會永遠停在「產生中…」，
// 客人沒有重試、沒有逾時、也沒有線索知道下一步該做什麼。
const state = ref('loading') // loading | ready | unavailable

onMounted(async () => {
  // 單號由 items.create 的 action flow 補上，通常送出頁輪詢時就已取得；
  // 這裡再讀一次以支援重新整理。取不到也不擋——訂單確實已建立。
  const n = await orderService.getOrderNumber(route.params.id)
  orderNumber.value = n
  state.value = n ? 'ready' : 'unavailable'
})
</script>
