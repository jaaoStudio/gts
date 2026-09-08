<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <router-link
        to="/account/orders"
        class="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-steel-500 transition-colors hover:text-steel-900"
      >
        <PhCaretLeft :size="12" weight="bold" /> 我的訂購單
      </router-link>

      <div v-if="loading" class="mt-8 space-y-4">
        <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-[1.5rem] bg-steel-100" />
      </div>

      <div
        v-else-if="error"
        class="mt-8 rounded-2xl border border-steel-200 bg-white py-20 text-center text-steel-500"
      >
        {{ error }}
      </div>

      <template v-else-if="order">
        <!-- 狀態 -->
        <header class="mt-6">
          <div class="flex flex-wrap items-center gap-4">
            <h1 class="font-mono text-2xl font-bold tracking-tight text-steel-900 sm:text-3xl">
              {{ order.order_number || `#${order.id}` }}
            </h1>
            <OrderStatusChip :status="order.status" />
          </div>
          <p class="mt-3 leading-relaxed text-steel-600">{{ statusHint }}</p>
          <p class="mt-1 font-mono text-xs text-steel-400">
            送出於 {{ formatDateTime(order.date_created) }}
          </p>
        </header>

        <!-- 待付款：匯款資訊。刻意只在這個狀態顯示，不放在任何公開頁面 -->
        <section
          v-if="order.status === 'quoted'"
          class="mt-8 rounded-[1.5rem] border-2 border-steel-900 bg-white p-6"
        >
          <h2 class="font-display text-lg font-semibold text-steel-900">匯款資訊</h2>

          <!-- confirmed_total 為 null＝老闆手動改了狀態但沒按「確認報價」。
               這時絕不能顯示 NT$0，客人會以為不用付錢。 -->
          <div class="mt-4 rounded-2xl bg-steel-50 px-5 py-4">
            <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">應付金額</p>
            <p
              v-if="order.confirmed_total != null"
              class="mt-1 font-mono text-3xl font-bold tracking-tight text-steel-900"
            >
              NT${{ order.confirmed_total.toLocaleString() }}
            </p>
            <p v-else class="mt-1 leading-relaxed text-steel-600">
              金額尚在確認中，請先不要匯款，我們會盡快與您聯絡。
            </p>
          </div>

          <dl v-if="bankInfo" class="mt-4 space-y-2.5 text-sm">
            <div class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">銀行</dt>
              <dd class="font-medium text-steel-900">{{ bankInfo.bankName }}</dd>
            </div>
            <div class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">帳號</dt>
              <dd class="font-mono font-medium text-steel-900">{{ bankInfo.bankAccount }}</dd>
            </div>
            <div class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">戶名</dt>
              <dd class="font-medium text-steel-900">{{ bankInfo.bankAccountName }}</dd>
            </div>
          </dl>
          <p v-else class="mt-4 text-sm leading-relaxed text-steel-500">
            匯款資訊尚未設定，請直接與我們聯絡取得帳號。
          </p>

          <!-- 對帳實際靠的是客人回報的末五碼＋銀行顯示的匯款人姓名（台灣現行為 X*X 遮罩），
               所以備註只是輔助，不要寫成硬性要求。 -->
          <p class="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-800">
            匯款備註可填單號
            <span class="font-mono font-bold">{{ order.order_number || `#${order.id}` }}</span>
            或您的姓名。
          </p>

          <!-- 我已匯款：只寫入 payment_note，狀態一律由老闆對帳後推進。
               金額未確認時不顯示表單——不知道要付多少就不該回報已匯款。 -->
          <div v-if="order.confirmed_total != null" class="mt-5 border-t border-steel-200 pt-5">
            <p v-if="order.payment_note" class="text-sm leading-relaxed text-steel-600">
              已收到您回報的帳號末五碼
              <span class="font-mono font-bold text-steel-900">{{ order.payment_note }}</span>，
              我們核對後會更新狀態。
            </p>

            <form v-else class="flex flex-wrap items-end gap-3" @submit.prevent="reportPayment">
              <label class="flex-1">
                <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">
                  匯款後請填帳號末五碼
                </span>
                <!-- 送出期間鎖住：值已在 reportPayment() 內定住，這裡是不讓畫面
                     暗示「還改得動」——客人改了字卻送出舊值，比不給改更難解釋 -->
                <input
                  v-model.trim="paymentNote"
                  type="text"
                  inputmode="numeric"
                  pattern="\d{5}"
                  maxlength="5"
                  placeholder="12345"
                  :disabled="reporting"
                  class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 font-mono text-steel-900 outline-none transition-colors placeholder:text-steel-300 focus:border-steel-900 disabled:bg-steel-50 disabled:text-steel-400"
                />
              </label>
              <button
                type="submit"
                :disabled="!canReport"
                class="rounded-full bg-steel-900 px-6 py-3.5 font-display text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {{ reporting ? '送出中…' : '我已匯款' }}
              </button>
            </form>
            <p v-if="reportError" class="mt-2 text-sm text-red-600">{{ reportError }}</p>
          </div>
        </section>

        <!-- 已出貨：貨運單號 -->
        <section
          v-if="order.status === 'shipped' && order.tracking_number"
          class="mt-8 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6"
        >
          <h2 class="font-display text-lg font-semibold text-steel-900">出貨資訊</h2>
          <div class="mt-4 space-y-2.5 text-sm">
            <div class="flex gap-3">
              <span class="w-20 shrink-0 text-steel-500">貨運單號</span>
              <span class="font-mono font-bold text-steel-900">{{ order.tracking_number }}</span>
            </div>
            <div v-if="order.shipped_at" class="flex gap-3">
              <span class="w-20 shrink-0 text-steel-500">出貨時間</span>
              <span class="text-steel-900">{{ formatDateTime(order.shipped_at) }}</span>
            </div>
          </div>
        </section>

        <!-- 品項 -->
        <section class="mt-8 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6">
          <h2 class="font-display text-lg font-semibold text-steel-900">訂購品項</h2>

          <ul class="mt-5 divide-y divide-steel-100">
            <li v-for="item in order.items" :key="item.id" class="flex gap-4 py-4 first:pt-0">
              <div class="min-w-0 flex-1">
                <p class="font-display text-sm font-semibold leading-snug text-steel-900">
                  {{ item.product_name }}
                </p>
                <p v-if="item.spec_name" class="mt-0.5 text-sm text-steel-500">
                  規格：{{ item.spec_name }}
                </p>
                <p class="mt-0.5 font-mono text-xs text-steel-400">× {{ item.quantity }}</p>
              </div>
              <div class="text-right">
                <p class="font-mono text-sm font-bold text-steel-900">{{ itemTotal(item) }}</p>
                <!-- 老闆改過價才顯示原價，讓調整是透明的 -->
                <p
                  v-if="item.confirmed_price != null && item.confirmed_price !== item.unit_price"
                  class="font-mono text-xs text-steel-400 line-through"
                >
                  {{ item.unit_price == null ? '詢價' : `NT$${(item.unit_price * item.quantity).toLocaleString()}` }}
                </p>
              </div>
            </li>
          </ul>

          <!--
            參考小計是「送出當下」的快照，老闆改價後它就不再是應付金額的基底。
            把它留在計算欄裡，客人會拿它去加運費與折扣，怎麼算都對不上應付金額
            （少的正是改價的差額）。因此獨立成一區並置灰，明確排除在算式之外。
          -->
          <div v-if="order.subtotal != null" class="mt-5 border-t border-steel-200 pt-5">
            <div class="flex justify-between text-sm text-steel-400">
              <span>送出時參考小計</span>
              <span class="font-mono">NT${{ order.subtotal.toLocaleString() }}</span>
            </div>
            <p v-if="isConfirmed" class="mt-1.5 text-xs leading-relaxed text-steel-400">
              價格已由專人重新確認，實際金額請看下方。
            </p>
          </div>

          <!-- 真正會相加的項目才放進這一欄 -->
          <dl
            v-if="isConfirmed"
            class="mt-4 space-y-2.5 border-t border-steel-200 pt-4 text-sm"
          >
            <div class="flex justify-between">
              <dt class="text-steel-500">確認後小計</dt>
              <dd class="font-mono text-steel-700">NT${{ confirmedSubtotal.toLocaleString() }}</dd>
            </div>
            <div v-if="order.shipping_fee != null" class="flex justify-between">
              <dt class="text-steel-500">運費</dt>
              <dd class="font-mono text-steel-700">
                {{ order.shipping_fee === 0 ? '免運' : `NT$${order.shipping_fee.toLocaleString()}` }}
              </dd>
            </div>
            <div v-if="order.discount" class="flex justify-between">
              <dt class="text-steel-500">折扣</dt>
              <dd class="font-mono text-steel-700">−NT${{ order.discount.toLocaleString() }}</dd>
            </div>
            <div class="flex items-baseline justify-between border-t border-steel-200 pt-3">
              <dt class="font-display font-semibold text-steel-900">應付金額</dt>
              <dd class="font-mono text-xl font-bold text-steel-900">
                NT${{ order.confirmed_total.toLocaleString() }}
              </dd>
            </div>
          </dl>

          <p v-if="order.has_quote_items" class="mt-4 text-sm leading-relaxed text-steel-500">
            本單含待報價品項，實際金額以我們確認後為準。
          </p>
        </section>

        <!-- 聯絡資訊 -->
        <section class="mt-8 rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6">
          <h2 class="font-display text-lg font-semibold text-steel-900">聯絡與送貨資訊</h2>
          <dl class="mt-4 space-y-2.5 text-sm">
            <div v-if="order.contact_name" class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">聯絡人</dt>
              <dd class="text-steel-900">{{ order.contact_name }}</dd>
            </div>
            <div v-if="order.contact_phone" class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">電話</dt>
              <dd class="font-mono text-steel-900">{{ order.contact_phone }}</dd>
            </div>
            <div v-if="order.contact_address" class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">送貨地址</dt>
              <dd class="text-steel-900">{{ order.contact_address }}</dd>
            </div>
            <div v-if="order.note" class="flex gap-3">
              <dt class="w-20 shrink-0 text-steel-500">備註</dt>
              <dd class="whitespace-pre-wrap text-steel-900">{{ order.note }}</dd>
            </div>
          </dl>
        </section>
      </template>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { orderService, ORDER_STATUS } from '../services/orderService'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import OrderStatusChip from '../components/OrderStatusChip.vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import { effectivePrice, confirmedSubtotal as calcConfirmedSubtotal } from '../utils/orderTotals'

const route = useRoute()
const settingsStore = useSettingsStore()

const order = ref(null)
const loading = ref(true)
const error = ref(null)

const paymentNote = ref('')
const reporting = ref(false)
const reportError = ref(null)

// 帳號末五碼一定是數字。inputmode="numeric" 只換手機鍵盤、pattern 只在原生表單
// 驗證時作用，都擋不住貼上的 "abcde"，所以送出條件要自己驗。
const LAST_FIVE_DIGITS = /^\d{5}$/
const canReport = computed(() => LAST_FIVE_DIGITS.test(paymentNote.value) && !reporting.value)

// 老闆按下確認後才有應付金額；在那之前這張單沒有任何可相加的數字
const isConfirmed = computed(() => order.value?.confirmed_total != null)

// 應付金額的基底。算法與 itemTotal() 共用 utils/orderTotals 的取價規則，
// 逐行金額加起來才保證等於這個小計。
const confirmedSubtotal = computed(() => calcConfirmedSubtotal(order.value?.items))

const statusHint = computed(() => ORDER_STATUS[order.value?.status]?.hint || '')
const bankInfo = computed(() => settingsStore.bankInfo)

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

const itemTotal = (item) => {
  const price = effectivePrice(item)
  return price == null ? '待報價' : `NT$${(price * item.quantity).toLocaleString()}`
}

const reportPayment = async () => {
  // 表單是 @submit.prevent，按 Enter 會繞過 disabled 的按鈕，這裡要再擋一次
  if (!canReport.value) return

  // 先把實際送出的值定住。204 的 fallback 若回頭讀 paymentNote.value，讀到的是
  // 「回應到達當下」的輸入框內容——客人在等待期間改了字，成功提示就會顯示他改過的
  // 新號碼，但送到 Directus 的是舊的那組。畫面同時隱藏表單，於是他以為更正成功，
  // 店家卻拿著舊末五碼在對帳。請求與 fallback 必須用同一份快照。
  const submittedNote = paymentNote.value

  reporting.value = true
  reportError.value = null
  try {
    const updated = await orderService.reportPayment(order.value.id, submittedNote)
    // Directus 回 204 時 updated 是 null。少了防護會拋 TypeError 被下面接住顯示
    // 「回報失敗」，但寫入其實成功了——客人會重送。
    order.value.payment_note = updated?.payment_note ?? submittedNote
  } catch (err) {
    reportError.value = '回報失敗，請稍後再試或直接與我們聯絡。'
    console.error('Error reporting payment:', err)
  } finally {
    reporting.value = false
  }
}

onMounted(async () => {
  try {
    order.value = await orderService.getOrder(route.params.id)

    // Directus 在權限尚未成立時會回 HTTP 204、SDK 拿到 null——沒拋錯但也沒資料。
    // 少了這行，loading/error/order 三個渲染分支會同時不成立而整頁空白。
    if (!order.value) error.value = '找不到這張訂購單。'

    // 匯款資訊只有登入客戶讀得到，且只有「待付款」才會顯示——沒必要每次都拉
    if (order.value?.status === 'quoted') await settingsStore.fetchPaymentInfo()
  } catch (err) {
    // 權限過濾讓別人的單直接查不到，這裡的錯誤同時涵蓋「不存在」與「不是你的」
    error.value = '找不到這張訂購單。'
    console.error('Error loading order:', err)
  } finally {
    loading.value = false
  }
})
</script>
