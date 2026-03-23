<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <Navbar />

    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Loading -->
      <div v-if="authStore.loading" class="flex justify-center py-20">
        <div class="w-10 h-10 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin"></div>
      </div>

      <!-- Profile Card -->
      <div v-else-if="authStore.user" class="space-y-6">
        <!-- Header -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="h-32 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500"></div>
          <div class="px-6 pb-6 -mt-12">
            <div class="flex items-end gap-4">
              <img
                v-if="authStore.userAvatar"
                :src="authStore.userAvatar"
                :alt="authStore.userName"
                class="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg"
              />
              <div v-else class="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 ring-4 ring-white dark:ring-slate-800 shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="pb-1">
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ authStore.userName }}</h1>
                <p class="text-slate-500 dark:text-slate-400 text-sm">{{ authStore.user.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">帳戶資訊</h2>
          <dl class="space-y-4">
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">名稱</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.userName }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">Email</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.user.email }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">公司名稱</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.company_name }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">統一編號</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.tax_id }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">電話</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.phone }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">會員等級</dt>
              <dd class="text-sm font-medium">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  {{ authStore.customer.customer_level || "會員" }}
                </span>
              </dd>
            </div>
            <div class="py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400 mb-1">預設送貨地址</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.shipping_address }}</dd>
            </div>
            <div class="py-2">
              <dt class="text-sm text-slate-500 dark:text-slate-400 mb-1">預設帳單地址</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.billing_address }}</dd>
            </div>
          </dl>
        </div>


        <!-- Actions -->
        <div class="flex justify-end">
          <button
            @click="handleLogout"
            class="px-5 py-2.5 text-sm font-medium text-red-500 hover:text-white border border-red-300 dark:border-red-500/30 hover:bg-red-500 rounded-xl transition-all duration-200"
          >
            登出
          </button>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await router.replace('/login')
  }
})

async function handleLogout() {
  await authStore.logout()
  await router.replace('/')
}
</script>
