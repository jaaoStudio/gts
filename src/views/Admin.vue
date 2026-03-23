<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Top Bar -->
    <header class="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <router-link to="/" class="flex items-center gap-2 text-slate-400 hover:text-orange-400 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span class="text-sm">返回商店</span>
            </router-link>
            <div class="h-4 w-px bg-slate-700"></div>
            <h1 class="text-white font-semibold">管理後台</h1>
          </div>

          <!-- User Info -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <img
                v-if="authStore.userAvatar"
                :src="authStore.userAvatar"
                :alt="authStore.userName"
                class="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700"
              />
              <div v-else class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-medium">
                {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <span class="text-sm text-slate-300 hidden sm:block">{{ authStore.userName }}</span>
            </div>
            <button
              @click="handleLogout"
              class="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-lg transition-all"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 歡迎訊息 -->
      <div class="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-2xl p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">登入成功！</h2>
        <p class="text-slate-400 text-sm mb-1">歡迎，{{ authStore.userName }}</p>
        <p class="text-slate-500 text-xs">商品分類管理功能即將上線</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
