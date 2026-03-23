<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="text-center">
      <!-- Loading 狀態 -->
      <div v-if="!error" class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin"></div>
        <p class="text-slate-400 text-sm">正在完成登入...</p>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p class="text-white font-medium mb-1">登入失敗</p>
          <p class="text-slate-400 text-sm">{{ error }}</p>
        </div>
        <router-link
          to="/login"
          class="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
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
