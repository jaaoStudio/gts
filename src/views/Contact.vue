<template>
  <PageShell
    title="聯絡我們"
    eyebrow="Contact"
    lead="有任何商品、規格或報價需求，歡迎透過以下方式與我們聯繫，我們會盡快回覆。"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <!-- 電話 -->
      <a
        href="tel:0426580936"
        class="group flex items-start gap-4 rounded-[1.4rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:ring-steel-900/12"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-steel-100 text-steel-700 transition-colors group-hover:bg-brand-500 group-hover:text-white">
          <PhPhoneCall :size="20" weight="fill" />
        </span>
        <div>
          <p class="font-display text-sm font-semibold text-steel-900">電話</p>
          <p class="mt-1 font-mono text-lg font-bold tracking-tight text-steel-900">04-26580936</p>
          <p class="mt-1 text-sm text-steel-500">直接跟老闆叫貨</p>
        </div>
      </a>

      <!-- LINE -->
      <div class="flex items-start gap-4 rounded-[1.4rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)]">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#06C755]/10 text-[#06C755]">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.63V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="font-display text-sm font-semibold text-steel-900">LINE</p>
          <p class="mt-1 text-sm text-steel-500">加入我們的官方帳號，與我們聯繫</p>
          <div class="mt-3">
            <LineButton :floating="false" />
            <p v-if="!settingsStore.lineUrl" class="text-sm text-steel-400">LINE 帳號準備中</p>
          </div>
        </div>
      </div>

      <!-- 營業時間 -->
      <div class="flex items-start gap-4 rounded-[1.4rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)]">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-steel-100 text-steel-700">
          <PhClock :size="20" weight="fill" />
        </span>
        <div>
          <p class="font-display text-sm font-semibold text-steel-900">營業時間</p>
          <p class="mt-1 text-sm leading-relaxed text-steel-600">週一至週六 08:00–18:00<br />週日公休</p>
        </div>
      </div>

      <!-- 地址 -->
      <div class="flex items-start gap-4 rounded-[1.4rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)]">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-steel-100 text-steel-700">
          <PhMapPin :size="20" weight="fill" />
        </span>
        <div>
          <p class="font-display text-sm font-semibold text-steel-900">門市地址</p>
          <p class="mt-1 text-sm leading-relaxed text-steel-600"> 台中市清水區信義五街97號 </p>
        </div>
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '../components/PageShell.vue'
import LineButton from '../components/LineButton.vue'
import { useSettingsStore } from '../stores/settings'
import { PhPhoneCall, PhClock, PhMapPin } from '@phosphor-icons/vue'

const settingsStore = useSettingsStore()
</script>
