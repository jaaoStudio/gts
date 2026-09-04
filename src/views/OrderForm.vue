<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <header>
        <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">訂購單</p>
        <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
          我的訂購單
        </h1>
        <p class="mt-3 max-w-xl leading-relaxed text-steel-500">
          送出後由專人與您確認價格與庫存，確認後才需付款。
        </p>
      </header>

      <!-- 重新驗證的提示：下架移除、價格異動 -->
      <div v-if="orderStore.notices.length" class="mt-8 space-y-2">
        <div
          v-for="(notice, i) in orderStore.notices"
          :key="i"
          class="flex items-start gap-3 rounded-2xl border border-steel-200 bg-white px-5 py-4"
        >
          <PhInfo :size="20" weight="bold" class="mt-0.5 shrink-0 text-brand-500" />
          <p class="flex-1 text-sm leading-relaxed text-steel-700">{{ notice.text }}</p>
        </div>
        <button
          type="button"
          class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500 transition-colors hover:text-steel-900"
          @click="orderStore.dismissNotices()"
        >
          知道了
        </button>
      </div>

      <!-- 驗證失敗：保留品項，但要說清楚看到的可能是舊資料 -->
      <div
        v-if="orderStore.error"
        class="mt-8 rounded-2xl border border-steel-200 bg-white px-5 py-4 text-sm text-steel-600"
      >
        {{ orderStore.error }}
      </div>

      <!-- Loading -->
      <div v-if="orderStore.loading" class="mt-10 space-y-4">
        <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-[1.5rem] bg-steel-100" />
      </div>

      <!-- 空訂購單 -->
      <div
        v-else-if="orderStore.isEmpty"
        class="mt-10 rounded-[1.5rem] border border-steel-200 bg-white py-20 text-center"
      >
        <p class="text-steel-500">訂購單目前是空的。</p>
        <router-link
          to="/products"
          class="mt-6 inline-flex items-center gap-2 rounded-full bg-steel-900 px-6 py-3.5 font-display text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
        >
          去挑選商品 <PhArrowRight :size="16" weight="bold" />
        </router-link>
      </div>

      <!-- 品項 + 小計 -->
      <div v-else class="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ul class="space-y-4">
          <li
            v-for="item in orderStore.items"
            :key="item.variantId"
            class="flex gap-4 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-4 sm:gap-5 sm:p-5"
          >
            <router-link
              :to="`/product/${item.productSlug}`"
              class="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-steel-100 sm:h-28 sm:w-28"
            >
              <img
                :src="item.image || heroPlaceholder"
                :alt="item.productName"
                class="h-full w-full object-cover"
              />
            </router-link>

            <div class="flex min-w-0 flex-1 flex-col">
              <router-link
                :to="`/product/${item.productSlug}`"
                class="font-display text-sm font-semibold leading-snug text-steel-900 transition-colors hover:text-brand-500 sm:text-base"
              >
                {{ item.productName }}
              </router-link>

              <p v-if="item.specName" class="mt-1 text-sm text-steel-500">
                規格：{{ item.specName }}
              </p>
              <p v-if="item.sku" class="font-mono text-xs text-steel-400">{{ item.sku }}</p>

              <div class="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                <!-- 數量 -->
                <div class="flex items-center gap-1 rounded-full border border-steel-200 p-1">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900 disabled:opacity-40"
                    :disabled="item.quantity <= 1"
                    :aria-label="`減少 ${item.productName} 的數量`"
                    @click="orderStore.updateQuantity(item.variantId, item.quantity - 1)"
                  >
                    <PhMinus :size="14" weight="bold" />
                  </button>
                  <span class="min-w-8 text-center font-mono text-sm font-semibold text-steel-900">
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900"
                    :aria-label="`增加 ${item.productName} 的數量`"
                    @click="orderStore.updateQuantity(item.variantId, item.quantity + 1)"
                  >
                    <PhPlus :size="14" weight="bold" />
                  </button>
                </div>

                <div class="text-right">
                  <p class="font-mono text-base font-bold text-steel-900">
                    {{ lineTotal(item) }}
                  </p>
                  <button
                    type="button"
                    class="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-steel-400 transition-colors hover:text-brand-500"
                    @click="orderStore.remove(item.variantId)"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <!-- 小計 -->
        <aside class="rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6 lg:sticky lg:top-28">
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">小計</p>
          <p class="mt-2 font-mono text-3xl font-bold tracking-tight text-steel-900">
            NT${{ orderStore.subtotal.toLocaleString() }}
          </p>

          <p v-if="orderStore.hasQuoteItems" class="mt-2 text-sm leading-relaxed text-steel-500">
            另有 {{ orderStore.quoteItemCount }} 項待報價，未計入小計。
          </p>

          <p class="mt-4 text-sm leading-relaxed text-steel-500">
            此金額不含運費，且
            <span class="font-semibold text-steel-700">價格與庫存以專人確認為準</span>。
          </p>

          <button
            type="button"
            disabled
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white opacity-40"
          >
            送出訂購單
          </button>
          <p class="mt-2 text-center font-mono text-xs text-steel-400">送出功能即將開放</p>

          <router-link
            to="/products"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-steel-300 px-6 py-3.5 font-display text-sm font-semibold text-steel-800 transition-colors duration-300 hover:border-steel-900"
          >
            繼續挑選
          </router-link>
        </aside>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useOrderStore } from '../stores/order'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import heroPlaceholder from '@/assets/product-placeholder.svg'
import { PhArrowRight, PhInfo, PhMinus, PhPlus } from '@phosphor-icons/vue'

const orderStore = useOrderStore()

// 詢價品項沒有單價，不能算小計也不該顯示 NT$0
const lineTotal = (item) =>
  item.unitPrice == null ? '詢價' : `NT$${(item.unitPrice * item.quantity).toLocaleString()}`

// init() 已在 main.js 執行過，這裡只需對照 Directus 現況重新驗證
onMounted(() => orderStore.revalidate())
</script>
