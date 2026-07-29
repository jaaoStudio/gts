<template>
  <div class="relative flex min-h-[100dvh] items-center justify-center bg-steel-50 px-5">
    <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
    <div class="pointer-events-none absolute right-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-500/10 blur-[120px]" />

    <div class="relative text-center">
      <!-- Loading -->
      <div v-if="!error" class="flex flex-col items-center gap-5">
        <PhCircleNotch :size="44" weight="bold" class="animate-spin text-brand-500" />
        <p class="font-mono text-sm uppercase tracking-[0.16em] text-steel-500">正在完成登入…</p>
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
import { PhCircleNotch, PhWarningCircle } from '@phosphor-icons/vue'

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
