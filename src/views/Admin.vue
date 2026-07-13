<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <!-- Top bar -->
    <header class="sticky top-0 z-40 border-b border-steel-900/[0.06] bg-white/75 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <!-- Left -->
        <div class="flex items-center gap-3">
          <router-link to="/" class="inline-flex items-center gap-1.5 text-sm text-steel-500 transition-colors hover:text-brand-600">
            <PhArrowLeft :size="16" weight="bold" /> 返回商店
          </router-link>
          <span class="h-4 w-px bg-steel-200" />
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-steel-900 text-brand-500">
              <PhWrench :size="16" weight="fill" />
            </span>
            <h1 class="font-display text-base font-bold tracking-tight text-steel-900">管理後台</h1>
          </div>
        </div>

        <!-- Right -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2.5">
            <img
              v-if="authStore.userAvatar"
              :src="authStore.userAvatar"
              :alt="authStore.userName"
              class="h-8 w-8 rounded-full object-cover ring-1 ring-steel-200"
            />
            <span v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-steel-900 text-sm font-semibold text-white">
              {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
            </span>
            <span class="hidden text-sm font-medium text-steel-700 sm:block">{{ authStore.userName }}</span>
          </div>
          <button
            @click="handleLogout"
            class="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-3.5 py-1.5 text-xs font-medium text-steel-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <PhSignOut :size="14" weight="bold" /> 登出
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div class="rounded-[2rem] bg-white p-10 text-center ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] sm:p-16">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <PhCheckCircle :size="34" weight="fill" class="text-brand-500" />
        </div>
        <h2 class="mt-5 font-display text-2xl font-bold tracking-tight text-steel-900">登入成功</h2>
        <p class="mt-2 text-steel-500">歡迎，{{ authStore.userName }}</p>
        <p class="mt-1 font-mono text-xs text-steel-400">商品分類管理功能即將上線</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { PhArrowLeft, PhWrench, PhSignOut, PhCheckCircle } from '@phosphor-icons/vue'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  // 確認使用者已登入
  if (!authStore.isAuthenticated) {
    router.replace('/login')
  }
})

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}
</script>
