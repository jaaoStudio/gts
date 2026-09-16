<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      <header>
        <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">訂購單</p>
        <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
          訂購單
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
        <!--
          送出期間把整區鎖住。這是 vue-component-conventions「送出流程」對策的第 2 件，
          與 submit() 內的快照是**一組的，少一件都不夠**：快照擋的是「送出去的值不一致」，
          fieldset 擋的是「使用者以為還改得動」。

          ⚠️ 數量按鈕特別重要：沒有它，客人能在 await 期間把 2,500×1 加成 ×2，而交貨
          方式早就快照成超商了——送出去的是一張代收 5,100、超過 7-11 上限的單。store
          內對品項的重驗是安全網，這裡才是根治（why: docs/adr/0006）。

          `border-0 p-0 min-w-0`：fieldset 的預設樣式會弄壞 grid 版面。
        -->
        <fieldset :disabled="orderStore.submitting" class="min-w-0 space-y-4 border-0 p-0">
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
          <h2 class="font-display text-lg font-semibold text-steel-900">交貨與付款方式</h2>
          <p class="mt-1 text-sm text-steel-500">
            選擇後下方欄位會跟著調整。標示 <span class="text-red-500">*</span> 為必填。
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <label
              v-for="option in deliveryOptions"
              :key="option.value"
              class="flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors"
              :class="[
                form.deliveryMethod === option.value
                  ? 'border-steel-900 bg-steel-50'
                  : 'border-steel-200 hover:border-steel-400',
                option.disabled && 'cursor-not-allowed opacity-50 hover:border-steel-200',
              ]"
            >
              <input
                v-model="form.deliveryMethod"
                type="radio"
                name="delivery-method"
                :value="option.value"
                :disabled="option.disabled"
                class="mt-1 h-4 w-4 shrink-0 accent-steel-900"
              />
              <span class="min-w-0">
                <span class="block font-display text-sm font-semibold text-steel-900">
                  {{ option.label }}
                </span>
                <span class="mt-1 block text-xs leading-relaxed text-steel-500">
                  {{ option.hint }}
                </span>
              </span>
            </label>
          </div>

          <!-- 選項被停用時必須說明原因：一個灰掉又沒有解釋的選項，客人只會以為壞了 -->
          <p
            v-if="cvsBlockText"
            class="mt-3 rounded-xl bg-steel-50 px-4 py-3 text-xs leading-relaxed text-steel-600"
          >
            {{ cvsBlockText }}
          </p>

          <h2 class="mt-8 font-display text-lg font-semibold text-steel-900">聯絡資訊</h2>
          <p class="mt-1 text-sm text-steel-500">
            已帶入您的會員資料，這次要送到別處可直接修改。
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
                {{ isCvs ? '取貨人手機' : '聯絡電話' }} <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="form.contactPhone"
                required
                type="tel"
                inputmode="tel"
                class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors focus:border-steel-900"
              />
              <span v-if="isCvs" class="mt-1.5 block text-xs leading-relaxed text-steel-500">
                包裹到店會發簡訊通知，請填手機（09 開頭 10 碼）。
              </span>
            </label>
          </div>

          <label v-if="isCvs" class="mt-4 block">
            <span class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">
              取貨門市 <span class="text-red-500">*</span>
            </span>
            <input
              v-model.trim="form.cvsStore"
              type="text"
              placeholder="門市店號，或店名＋地址"
              class="mt-2 w-full rounded-xl border border-steel-200 px-4 py-3 text-steel-900 outline-none transition-colors placeholder:text-steel-400 focus:border-steel-900"
            />
            <span class="mt-1.5 block text-xs leading-relaxed text-steel-500">
              全台有多家同名門市，請盡量附上店號或地址。
              <a
                href="https://emap.pcsc.com.tw/"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-brand-600 underline underline-offset-2"
              >查門市</a>
            </span>
          </label>

          <label v-else class="mt-4 block">
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
        </fieldset>

        <!-- 小計 -->
        <aside class="rounded-[1.5rem] border border-steel-900/[0.06] bg-white p-6 lg:sticky lg:top-28">
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-steel-500">小計</p>
          <p class="mt-2 font-mono text-3xl font-bold tracking-tight text-steel-900">
            NT${{ orderStore.subtotal.toLocaleString() }}
          </p>

          <p v-if="orderStore.hasQuoteItems" class="mt-2 text-sm leading-relaxed text-steel-500">
            另有 {{ orderStore.quoteItemCount }} 項待報價，未計入小計。
          </p>

          <!-- 兩種交貨方式共用這一塊：宅配與超商的差異全收在 estimateShipping 裡，
               這裡只依它回傳的 state 決定顯示什麼。設定不完整時整行不顯示。 -->
          <div
            v-if="shipping.state !== SHIPPING.unavailable"
            class="mt-4 border-t border-steel-200 pt-4"
          >
            <div class="flex items-baseline justify-between text-sm">
              <span class="text-steel-500">
                運費<span v-if="shipping.state === SHIPPING.charged" class="text-steel-400">（預估）</span>
              </span>
              <span class="font-mono text-steel-700">
                <template v-if="shipping.state === SHIPPING.free">免運</template>
                <template v-else-if="shipping.state === SHIPPING.quote">報價時一併確認</template>
                <template v-else>NT${{ shipping.amount.toLocaleString() }}</template>
              </span>
            </div>
            <p v-if="shipping.note" class="mt-1.5 text-xs text-steel-400">{{ shipping.note }}</p>
            <p v-else-if="shipping.gap != null" class="mt-1.5 text-xs text-steel-400">
              再買 <span class="font-mono">NT${{ shipping.gap.toLocaleString() }}</span> 免運
            </p>
          </div>

          <p class="mt-4 text-sm leading-relaxed text-steel-500">
            {{ isCvs
              ? '取貨時再付款。包裹若超過超商尺寸限制，我們會與您改約宅配，且'
              : '運費為預估，重物與大材積商品可能另行報價，且' }}
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
import { useSettingsStore } from '../stores/settings'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { CVS_IBON, CVS_BLOCK, SHIPPING, cvsBlockReason, estimateShipping } from '../utils/orderTotals'
import { DELIVERY, DELIVERY_LABEL } from '../services/orderService'
import { trackGenerateLead } from '../utils/analytics'
import heroPlaceholder from '@/assets/product-placeholder.svg'
import { PhArrowRight, PhInfo, PhMinus, PhPlus } from '@phosphor-icons/vue'

const router = useRouter()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const form = reactive({
  // 宅配是既有的唯一路徑，維持為預設——超商要客人主動選，因為它附帶取貨期限與
  // 尺寸限制，不該由我們替他決定
  deliveryMethod: DELIVERY.homeDelivery,
  contactName: '',
  contactPhone: '',
  contactAddress: '',
  cvsStore: '',
  note: '',
})

const isCvs = computed(() => form.deliveryMethod === DELIVERY.cvsCod)

// 只擋確定的兩件事；尺寸與重量交給老闆逐單判斷（why: docs/adr/0006 第 4、5 條）
const cvsBlock = computed(() =>
  cvsBlockReason({
    subtotal: orderStore.subtotal,
    allItemsShippable: orderStore.allItemsShippable,
  })
)

const cvsBlockText = computed(() => {
  if (cvsBlock.value === CVS_BLOCK.oversize) {
    // ⚠️ 不要把原因寫死成「尺寸」。can_ship_cvs 是老闆憑經驗勾的判斷，不是量出來的
    // （why: docs/adr/0006 第 5 條），而且不能寄的理由未必是尺寸——耗材與化工整批
    // 設 false 是因為**超商禁寄危險物品**，那跟尺寸無關。講死一個理由會在那一類商品
    // 上直接說錯話。尺寸只當成「最常見的原因」提一句。
    return '本單含不適合超商寄送的品項（常見原因是超過尺寸限制，或屬於超商禁寄的品類），只能走宅配。'
  }
  if (cvsBlock.value === CVS_BLOCK.overLimit) {
    return `超商取貨付款的代收上限是 NT$${CVS_IBON.maxCollectable.toLocaleString()}，本單已超過，請改用宅配。`
  }
  return null
})

const deliveryOptions = computed(() => [
  {
    value: DELIVERY.homeDelivery,
    label: DELIVERY_LABEL[DELIVERY.homeDelivery],
    hint: '確認金額後匯款，款項確認後出貨。',
    disabled: false,
  },
  {
    value: DELIVERY.cvsCod,
    label: DELIVERY_LABEL[DELIVERY.cvsCod],
    hint: '到門市取貨時付現，不必先匯款。',
    disabled: !!cvsBlock.value,
  },
])

// 改數量或移除品項都可能讓已選的超商失效。留著一個選不到卻仍生效的選項，送出的會是
// 前台自己判定不可行的組合——直接退回宅配，原因由上方那段說明承擔。
watch(cvsBlock, (reason) => {
  if (reason && isCvs.value) form.deliveryMethod = DELIVERY.homeDelivery
})

// 預估運費。兩種交貨方式共用一個出口——宅配與超商的規則差異在 estimateShipping 裡。
// 宅配設定讀不到時 shippingRule 是 null，它會回 unavailable，運費那行整行不渲染：
// 退回加運費之前的畫面，而不是顯示一個猜出來的金額。
const shipping = computed(() =>
  estimateShipping({
    isCvs: isCvs.value,
    subtotal: orderStore.subtotal,
    hasQuoteItems: orderStore.hasQuoteItems,
    rule: settingsStore.shippingRule,
  })
)

// 送出的下一步就是「由專人與您確認價格與庫存」——也就是要打電話。三欄全空的單
// 到後台只能回頭翻會員資料，而會員資料的電話也可能沒填，所以電話是唯一的硬門檻。
// 只驗非空不驗格式：市話、分機、手機的寫法差太多，擋掉真客人的代價高於擋掉爛資料。
//
// ⚠️ 會員資料的檢查**刻意不放進來**：放進來會讓按鈕帶著 disabled:pointer-events-none
// 灰掉，客人既點不到也 hover 不到，submit() 內那段說明性錯誤永遠不可達——一個可診斷
// 的失敗會變成一顆沒有解釋的灰鈕。會員資料的問題留到點擊時處理，見 submit()。
//
// trim 過再判斷：輸入框有 v-model.trim，但 prefillFromCustomer 是直接指派
// `c.phone || ''`，會員資料裡若是一串空白就會原樣進來並讓這個閘門成立。
//
// ⚠️ 超商單**才**驗手機格式，兩條分支不一致是刻意的，不要順手統一：上面那段說
// 「擋掉真客人的代價高於擋掉爛資料」，但走超商時這個比較反過來——7-11 包裹到店
// 只發簡訊，市話收不到；收不到就是棄件，而退回的運費是老闆自己吃。手機在那條路上
// 是物流的硬需求，不是偏好（why: docs/adr/0006 第 7 條）。
const MOBILE_NUMBER = /^09\d{8}$/

/**
 * 送出前的欄位檢查。回傳錯誤訊息，`null` 代表可以送。
 *
 * **閘門與錯誤訊息共用同一份判斷**：按鈕的 disabled 與 submit() 內對快照的重驗都走
 * 這裡。兩邊各寫一份的話，規則改了只改一邊就會出現「按得下去但被擋、卻沒有訊息」。
 */
const checkOrderInput = ({ deliveryMethod, contactPhone, cvsStore }) => {
  const phone = (contactPhone || '').trim()
  if (!phone) return '請填寫聯絡電話，我們需要它才能與您確認價格與庫存。'

  if (deliveryMethod !== DELIVERY.cvsCod) return null

  if (!MOBILE_NUMBER.test(phone)) {
    return '超商取貨需要手機號碼（09 開頭 10 碼）才能收到到店通知簡訊。'
  }
  // 老闆在物流商後台建單時要填取件門市，沒有它這張單寄不出去
  if (!(cvsStore || '').trim()) return '請填寫取貨門市，我們需要它才能寄出包裹。'

  return null
}

const canSubmit = computed(() => !checkOrderInput(form) && !orderStore.submitting)

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

  // 整份表單一次定住，之後只用這份快照。canSubmit 只在「點下去的那一刻」成立，而上面的
  // 重抓中間隔著一段 await——客人在等待期間清掉電話，直接讀 form 就會把空字串一路送到
  // service 轉成 contact_phone: null。輸入框不在原生提交的 form 裡，required 也攔不到。
  // 沒有閘門的欄位也一起快照，才讀得出「送出的是同一個時間點的資料」。
  const payload = {
    deliveryMethod: form.deliveryMethod,
    contactName: form.contactName,
    contactPhone: form.contactPhone.trim(),
    contactAddress: form.contactAddress,
    cvsStore: form.cvsStore.trim(),
    note: form.note,
  }

  // canSubmit 只在「點下去的那一刻」成立，而上面那段重抓中間隔著一段 await——
  // 客人在等待期間清掉電話或門市，送出去的就會是不合法的資料。所以要對**快照**
  // 再驗一次，用的是同一個 checkOrderInput。
  const inputError = checkOrderInput(payload)
  if (inputError) {
    orderStore.submitError = inputError
    return
  }

  const result = await orderStore.submit(payload)

  if (!result) return

  // 放在這裡而不是完成頁：完成頁已被排除追蹤，而且輪詢逾時那條分支根本不會去完成頁，
  // 但那時訂購單一樣已經建立。品項數由 submit() 回傳（它成功後會 clear()）
  trackGenerateLead(result.snapshot)

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
onMounted(() => {
  orderStore.revalidate()
  // 運費規則來自 site_settings。Footer 也會呼叫，但不能假設它先跑完——
  // fetchSettings() 有快取，重複呼叫不會重打 API。
  settingsStore.fetchSettings()
})
</script>
