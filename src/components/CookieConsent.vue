<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
    enter-from-class="translate-y-full opacity-0"
    leave-active-class="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-50 border-t border-steel-200 bg-white shadow-2xl"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie 設定"
    >
      <div class="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex gap-4">
          <PhCookie :size="28" weight="duotone" class="hidden shrink-0 text-brand-500 sm:block" />
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-brand-600">Cookie</p>
            <p class="mt-2 text-sm leading-relaxed text-steel-600">
              我們使用 Cookie 進行網站流量分析，藉此了解哪些商品受到關注、改善網站內容。
              您可以自由選擇接受或拒絕，<strong class="font-semibold text-steel-900">拒絕不會影響您瀏覽或使用本網站的任何功能</strong>。
              詳見<router-link to="/privacy" class="text-brand-600 underline underline-offset-2 transition-colors hover:text-brand-700">隱私權政策</router-link>。
            </p>
          </div>
        </div>

        <!-- 兩顆按鈕的尺寸與層級必須相當：EDPB 要求拒絕和接受一樣容易，
             把拒絕降級成文字連結或藏進第二層就是違規的那一種 banner -->
        <div class="flex shrink-0 gap-3">
          <button
            type="button"
            class="flex-1 rounded-full bg-steel-100 px-6 py-3 font-display text-sm font-semibold text-steel-900 transition-colors duration-300 hover:bg-steel-200 lg:flex-none"
            @click="reject"
          >
            拒絕
          </button>
          <button
            type="button"
            class="flex-1 rounded-full bg-steel-900 px-6 py-3 font-display text-sm font-semibold text-white transition-colors duration-300 hover:bg-brand-500 lg:flex-none"
            @click="accept"
          >
            接受
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { PhCookie } from '@phosphor-icons/vue'
import { consent, setConsent, enableAnalytics, disableAnalytics } from '../utils/analytics'

const visible = computed(() => consent.value === null)

// 兩邊都不重載：使用者可能是在 /order 填到一半才按掉 banner，而 OrderForm 的
// form 是純 reactive、沒有持久化，重載會把已填的聯絡資料清光。
const accept = () => {
  setConsent('granted')
  enableAnalytics()
}

const reject = () => {
  setConsent('denied')
  disableAnalytics()
}
</script>
