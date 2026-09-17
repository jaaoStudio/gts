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
          <template v-else-if="state === 'error'">
            <p class="mt-1.5 text-sm leading-relaxed text-steel-500">
              暫時讀不到單號，您的訂購單已經成功送出。
            </p>
            <button
              type="button"
              class="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-steel-500 underline underline-offset-4 transition-colors hover:text-brand-500"
              @click="loadOrderNumber"
            >
              重試
            </button>
          </template>
          <p v-else class="mt-1.5 text-sm leading-relaxed text-steel-500">
            單號稍後產生，可到「我的訂購單」查看
          </p>
        </div>

        <!-- 下一步要依交貨方式分岔：對超商單講「會通知您匯款方式」是錯的指示，
             那個匯款資訊永遠不會來。交貨方式不明時走中性版本——寧可少講一句，
             也不要講一句對一半客人是錯的。 -->
        <p class="mt-6 leading-relaxed text-steel-600">
          我們會盡快與您確認價格與庫存，確認後會通知您應付金額<template
            v-if="deliveryMethod === DELIVERY.homeDelivery"
          >與匯款方式</template>。
          <template v-if="deliveryMethod === DELIVERY.cvsCod">
            <br>包裹寄出後會以簡訊通知您到門市取貨，取貨時再付款。
          </template>
          <span v-else class="font-semibold text-steel-800">確認前不需要先付款。</span>
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
import { DELIVERY, orderService } from '../services/orderService'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { PhCheckCircle } from '@phosphor-icons/vue'

const route = useRoute()
const orderNumber = ref(null)

// 交貨方式只從 history state 取，**不為它多打一次 API**：它唯一的用途是挑一句文案，
// 而拿不到時的中性版本本來就是正確的。重新整理會讓 state 消失，那時就走中性版本。
const deliveryMethod = ref(null)

// 四態各自對應一個真正不同的事實，不可合併：
//   ready       單號在手上
//   loading     正在讀
//   unavailable 讀得到訂單、但 order_number 還沒被 flow 蓋上
//   error       根本沒讀到（網路／session）——可以重試，而且多半會成功
// 少了 error，一次抖動會被渲染成 unavailable 那句「單號稍後產生」，
// 對一筆毫秒前 app 還握有單號的訂單來說，那是個編造出來的終局答案。
const state = ref('loading') // loading | ready | unavailable | error

/** 重讀單號。也是 error 態那顆重試鈕的處理函式 */
const loadOrderNumber = async () => {
  state.value = 'loading'
  try {
    // 單號由 items.create 的 action flow 補上，通常送出頁輪詢時就已取得；
    // 這裡再讀一次以支援重新整理。取不到也不擋——訂單確實已建立。
    const n = await orderService.getOrderNumber(route.params.id)
    orderNumber.value = n
    state.value = n ? 'ready' : 'unavailable'
  } catch (err) {
    console.error('讀取訂購單號失敗:', err)
    state.value = 'error'
  }
}

onMounted(() => {
  // 送出頁輪詢命中時單號必然已存在，並隨導航一起放進 history state。
  // 有它就直接用，省掉一次必然多餘的讀取，也不會閃一下「產生中…」。
  // 綁 orderId 比對：history state 會跟著這個 entry 留在瀏覽器裡，
  // 不對照就可能把上一張單的單號貼到這張單上。
  const carried = window.history.state
  const sameOrder = String(carried?.orderId) === String(route.params.id)

  // 交貨方式與單號分開判斷：單號讀不到時仍要顯示正確的下一步文案
  if (sameOrder && carried?.deliveryMethod) deliveryMethod.value = carried.deliveryMethod

  if (sameOrder && carried?.orderNumber) {
    orderNumber.value = carried.orderNumber
    state.value = 'ready'
    return
  }

  loadOrderNumber()
})
</script>
