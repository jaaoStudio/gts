<template>
  <div class="relative flex min-h-[100dvh] items-center justify-center bg-steel-50 px-5">
    <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
    <div class="pointer-events-none absolute right-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-500/10 blur-[120px]" />

    <div class="relative text-center">
      <!-- Loading — 視覺接續 worker/auth-callback-worker.js 的過場頁。
           那頁是本頁的前一個畫面(第二擊 navigation 期間畫面仍停在那),兩邊長得一樣
           才不會在中間閃一下。⚠️ 這裡刻意不重播 logo 描邊動畫,只承接呼吸循環——
           一次性動畫在換頁時重播會很明顯。改動任一邊記得同步另一邊。 -->
      <div v-if="!error" class="flex flex-col items-center">
        <svg class="block h-[76px] w-[76px]" viewBox="0 0 512 512" fill="none" role="img" aria-label="金同心實業">
          <path d="M133 419.56V184.04C133 122.6 163.72 91.8799 225.16 91.8799H286.6C348.04 91.8799 378.76 122.6 378.76 184.04V419.56" stroke="#101115" stroke-width="30.72" stroke-linecap="round" />
          <path d="M204.68 204.52H307.08" stroke="#101115" stroke-width="30.72" stroke-linecap="round" />
          <path class="chip" d="M271.24 271.08H240.52C229.209 271.08 220.04 280.249 220.04 291.56V322.28C220.04 333.591 229.209 342.76 240.52 342.76H271.24C282.551 342.76 291.72 333.591 291.72 322.28V291.56C291.72 280.249 282.551 271.08 271.24 271.08Z" fill="#F97316" />
        </svg>

        <p class="mt-[22px] font-mono text-[13px] font-medium uppercase tracking-[0.16em] text-steel-500">正在完成登入…</p>

        <div class="mt-[18px] h-0.5 w-[168px] overflow-hidden rounded-full bg-steel-200">
          <span class="bar-fill block h-full w-2/5 rounded-full bg-brand-500" />
        </div>
      </div>

      <!-- Error -->
      <div v-else class="flex flex-col items-center gap-5">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <PhWarningCircle :size="34" weight="fill" class="text-red-500" />
        </div>
        <div>
          <p class="font-display text-lg font-semibold text-steel-900">登入失敗</p>
          <p class="mt-1 text-sm text-steel-500">{{ error }}</p>
        </div>
        <router-link
          to="/login"
          class="inline-flex items-center gap-2 rounded-full bg-steel-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98]"
        >
          返回登入頁
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { PhWarningCircle } from '@phosphor-icons/vue'

const router = useRouter()
const authStore = useAuthStore()
const error = ref(null)

onMounted(async () => {
  const success = await authStore.handleCallback()

  if (success) {
    // 依角色導向：管理員 → /admin、一般會員 → /account
    router.replace(authStore.accountRoute)
  } else {
    error.value = authStore.error || '無法完成登入，請再試一次'
  }
})
</script>

<style scoped>
/* 與 worker 過場頁同一組循環動態。循環型動畫在任何時間點被打斷都不突兀，
   這頁隨時可能因 readMe 回來而換掉。 */
/* ⚠️ animation 一律用 class 在這裡宣告，別用 Tailwind 的 [animation:name_...] arbitrary：
   scoped style 會把 @keyframes 改名加 hash，只改寫同一個 style block 內的引用，
   全域產生的 utility 會找不到改名後的 keyframes，動畫直接不跑。 */
.chip {
  transform-box: fill-box;
  transform-origin: center;
  animation: breathe 2.2s cubic-bezier(0.32, 0.72, 0, 1) infinite;
}

.bar-fill {
  animation: sweep 1.5s cubic-bezier(0.32, 0.72, 0, 1) infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.9); }
}

@keyframes sweep {
  from { transform: translateX(-110%); }
  to { transform: translateX(360%); }
}

@media (prefers-reduced-motion: reduce) {
  .chip { animation: none; }
  .bar-fill { width: 100%; animation: none; opacity: 0.5; }
}
</style>
