<template>
  <div class="relative flex min-h-[100dvh] items-center justify-center bg-steel-50 px-5 py-16 sm:px-8">
    <!-- Blueprint texture + brand glow, matching the site language -->
    <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
    <div class="pointer-events-none absolute right-[-10%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-brand-500/10 blur-[120px]" />
    <div class="pointer-events-none absolute bottom-[-12%] left-[-8%] h-[26rem] w-[26rem] rounded-full bg-steel-900/[0.04] blur-[110px]" />

    <div class="relative w-full max-w-md">
      <!-- Brand mark + heading -->
      <div class="mb-8 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-steel-900 shadow-[0_20px_40px_-16px_rgba(16,17,21,0.5)]">
          <PhToolbox :size="30" weight="regular" class="text-brand-500" />
        </div>
        <p class="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-steel-400">會員專區 · Member</p>
        <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-steel-900">會員登入</h1>
        <p class="mt-2 text-sm text-steel-500">使用 Google 帳號，掌握到貨通知與會員專屬優惠</p>
      </div>

      <!-- Card -->
      <div class="rounded-[2rem] bg-white p-7 ring-1 ring-steel-900/[0.06] shadow-[0_40px_80px_-30px_rgba(16,17,21,0.28)] sm:p-9">
        <!-- Error state -->
        <div v-if="authStore.error" class="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <PhWarningCircle :size="20" weight="fill" class="mt-0.5 shrink-0 text-red-500" />
          <p class="text-sm leading-relaxed text-red-700">{{ authStore.error }}</p>
        </div>

        <!-- Google login -->
        <button
          id="google-login-btn"
          @click="loginWithGoogle"
          :disabled="authStore.loading"
          class="flex w-full items-center justify-center gap-3 rounded-full border border-steel-200 bg-white px-6 py-3.5 font-display text-base font-semibold text-steel-800 shadow-[0_1px_2px_rgba(16,17,21,0.04)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-steel-900 hover:shadow-[0_16px_36px_-18px_rgba(16,17,21,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <template v-if="!authStore.loading">
            <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 帳號登入
          </template>
          <template v-else>
            <PhCircleNotch :size="18" weight="bold" class="animate-spin text-steel-500" />
            登入中...
          </template>
        </button>

        <!-- Divider -->
        <div class="my-6 flex items-center gap-4">
          <span class="h-px flex-1 bg-steel-100" />
          <span class="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel-400">
            <PhLockKey :size="13" weight="bold" /> 安全登入
          </span>
          <span class="h-px flex-1 bg-steel-100" />
        </div>

        <p class="text-center text-xs leading-relaxed text-steel-400">
          點擊登入即表示您同意本站服務條款。
        </p>
      </div>

      <!-- Back home -->
      <div class="mt-6 text-center">
        <router-link
          to="/"
          class="inline-flex items-center gap-1.5 text-sm text-steel-500 transition-colors hover:text-brand-600"
        >
          <PhArrowLeft :size="15" weight="bold" /> 返回首頁
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { PhToolbox, PhWarningCircle, PhCircleNotch, PhLockKey, PhArrowLeft } from '@phosphor-icons/vue'

const router = useRouter()
const authStore = useAuthStore()

// 如果已登入，直接跳轉
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await authStore.fetchCurrentUser()
    if (authStore.isAuthenticated) {
      await router.replace(authStore.accountRoute)
    }
  }
})

function loginWithGoogle() {
  window.location.href = authStore.getGoogleLoginUrl()
}
</script>
