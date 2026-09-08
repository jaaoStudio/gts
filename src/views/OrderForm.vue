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
        <div class="space-y-4">
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

        <!-- 聯絡資訊：預設帶入會員資料，但每張單可改（工地／公司不同地址）-->
        <section
          v-if="authStore.isAuthenticated"
          class="rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6"
        >
          <h2 class="font-display text-lg font-semibold text-steel-900">聯絡與送貨資訊</h2>
          <p class="mt-1 text-sm text-steel-500">
            已帶入您的會員資料，這次要送到別處可直接修改。標示 <span class="text-red-500">*</span> 為必填。
          </p>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">聯絡人</span>
              <input
                v-model.trim="form.contactName"
                type="text"
                class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors focus:border-steel-900"
              />
            </label>
            <label class="block">
              <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">
                聯絡電話 <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="form.contactPhone"
                required
                type="tel"
                inputmode="tel"
                class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors focus:border-steel-900"
              />
            </label>
          </div>

          <label class="mt-4 block">
            <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">送貨地址</span>
            <input
              v-model.trim="form.contactAddress"
              type="text"
              class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors focus:border-steel-900"
            />
          </label>

          <label class="mt-4 block">
            <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">備註</span>
            <textarea
              v-model.trim="form.note"
              rows="3"
              placeholder="需要特定規格、到貨時間或其他需求，請在這裡說明"
              class="mt-2 w-full resize-y rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors placeholder:text-steel-400 focus:border-steel-900"
            />
          </label>
        </section>
        </div>

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

          <!-- 未登入：不強制跳轉，購物車還在 localStorage，登入後回來即可 -->
          <template v-if="!authStore.isAuthenticated">
            <p class="mt-6 rounded-2xl bg-steel-50 px-4 py-3 text-sm leading-relaxed text-steel-600">
              請先登入，我們才能把訂購單與您的會員資料對應起來。
            </p>
            <button
              type="button"
              class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
              @click="goLogin"
            >
              登入後送出
            </button>
          </template>

          <button
            v-else
            type="button"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-steel-900 px-6 py-4 font-display text-base font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ orderStore.submitting ? '送出中…' : '送出訂購單' }}
          </button>

          <p v-if="orderStore.submitError" class="mt-3 text-sm leading-relaxed text-red-600">
            {{ orderStore.submitError }}
          </p>

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
import { computed, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '../stores/order'
import { useAuthStore } from '../stores/auth'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import heroPlaceholder from '@/assets/product-placeholder.svg'
import { PhArrowRight, PhInfo, PhMinus, PhPlus } from '@phosphor-icons/vue'

const router = useRouter()
const orderStore = useOrderStore()
const authStore = useAuthStore()

const form = reactive({
  contactName: '',
  contactPhone: '',
  contactAddress: '',
  note: '',
})

// 送出的下一步就是「由專人與您確認價格與庫存」——也就是要打電話。三欄全空的單
// 到後台只能回頭翻會員資料，而會員資料的電話也可能沒填，所以電話是唯一的硬門檻。
// 只驗非空不驗格式：市話、分機、手機的寫法差太多，擋掉真客人的代價高於擋掉爛資料。
//
// ⚠️ 會員資料的檢查**刻意不放進來**：放進來會讓按鈕帶著 disabled:pointer-events-none
// 灰掉，客人既點不到也 hover 不到，submit() 內那段說明性錯誤永遠不可達——一個可診斷
// 的失敗會變成一顆沒有解釋的灰鈕。會員資料的問題留到點擊時處理，見 submit()。
const canSubmit = computed(() => !!form.contactPhone && !orderStore.submitting)

// 詢價品項沒有單價，不能算小計也不該顯示 NT$0
const lineTotal = (item) =>
  item.unitPrice == null ? '詢價' : `NT$${(item.unitPrice * item.quantity).toLocaleString()}`

/** 以會員資料填入表單。只填空欄位，避免蓋掉使用者已經改過的內容 */
const prefillFromCustomer = () => {
  const c = authStore.customer
  if (!c) return
  if (!form.contactName) form.contactName = c.user_name || ''
  if (!form.contactPhone) form.contactPhone = c.phone || ''
  if (!form.contactAddress) form.contactAddress = c.shipping_address || ''
}

const goLogin = () => {
  // 登入走 Google SSO 會離站再回來，先記下要回到哪裡（AdminCallback 會讀取）
  try {
    sessionStorage.setItem('gts_post_login_redirect', '/order')
  } catch {
    // 無痕模式可能寫不進去，登入後回到預設頁即可，購物車仍在 localStorage
  }
  router.push('/login')
}

const submit = async () => {
  // customer 由後端依登入帳號補上，前端不送；這裡僅確認會員資料已載入，
  // 否則後端反查不到對應的 customers 資料列，訂單會掛空。
  if (!authStore.customer?.id) {
    // 讀取失敗的話按鈕本身就是重試鈕：先重抓一次，救得回來就無縫往下送，
    // 客人不必重整頁面、也不會丟掉已經填好的聯絡資訊。
    if (authStore.customerStatus === 'error') {
      orderStore.submitError = null
      await authStore.refreshCustomerProfile()
    }

    if (!authStore.customer?.id) {
      // 依建檔 flow 的契約每個帳號都該有會員資料列（docs/proposals/訂購單.md:905），
      // 所以 missing 是後端壞了，重新登入救不了，只能請客人找我們。
      orderStore.submitError =
        authStore.customerStatus === 'missing'
          ? '您的會員資料尚未建立完成，請直接與我們聯絡，我們會協助您完成訂購。'
          : '目前讀不到您的會員資料，請稍後再按一次送出。'
      return
    }
  }

  const result = await orderStore.submit({
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    contactAddress: form.contactAddress,
    note: form.note,
  })

  if (!result) return

  // 極少數情況輪詢逾時而拿不到 id（flow 慢），此時直接帶去訂單列表——
  // 訂單已經建立，讓客人看得到比停在購物車重要
  if (result.id) {
    // 單號跟著這次導航一起帶過去。輪詢命中的那一刻 order_number 必然已存在
    // （action flow 是 customer + order_number + subtotal 一起寫入，
    // docs/proposals/訂購單.md:737），沒有理由讓完成頁再讀一次才拿得到。
    // 放在 history state 而非 store：生命週期剛好等於「這次送出」，不必自己清。
    router.replace({
      name: 'OrderDone',
      params: { id: result.id },
      state: { orderId: result.id, orderNumber: result.orderNumber },
    })
  } else {
    router.replace({ name: 'OrderHistory' })
  }
}

// customer 可能在本頁掛載後才由 authStore.init() 取回
watch(() => authStore.customer, prefillFromCustomer, { immediate: true })

// init() 已在 main.js 執行過，這裡只需對照 Directus 現況重新驗證
onMounted(() => orderStore.revalidate())
</script>
