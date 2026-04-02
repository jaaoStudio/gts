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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">帳戶資訊</h2>
            <button
              v-if="!isEditing"
              @click="enterEditMode"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl transition-all duration-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              編輯資料
            </button>
          </div>

          <!-- Display Mode -->
          <dl v-if="!isEditing" class="space-y-4">
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">名稱</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.user_name || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">Email</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.user.email }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">公司名稱</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.company_name || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">統一編號</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.tax_id || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
              <dt class="text-sm text-slate-500 dark:text-slate-400">電話</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.phone || '—' }}</dd>
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
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.shipping_address || '—' }}</dd>
            </div>
            <div class="py-2">
              <dt class="text-sm text-slate-500 dark:text-slate-400 mb-1">預設帳單地址</dt>
              <dd class="text-sm font-medium text-slate-900 dark:text-white">{{ authStore.customer.billing_address || '—' }}</dd>
            </div>
          </dl>

          <!-- Edit Mode -->
          <form v-else @submit.prevent="handleSave" class="space-y-5">
            <div>
              <label for="edit-user-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">名稱</label>
              <input
                id="edit-user-name"
                v-model="form.user_name"
                type="text"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                placeholder="請輸入名稱"
              />
            </div>
            <div>
              <label for="edit-phone" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">電話</label>
              <input
                id="edit-phone"
                v-model="form.phone"
                type="tel"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                placeholder="請輸入電話"
              />
            </div>
            <div>
              <label for="edit-company" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">公司名稱</label>
              <input
                id="edit-company"
                v-model="form.company_name"
                type="text"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                placeholder="請輸入公司名稱"
              />
            </div>
            <div>
              <label for="edit-tax-id" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">統一編號</label>
              <input
                id="edit-tax-id"
                v-model="form.tax_id"
                type="text"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
                placeholder="請輸入統一編號"
              />
            </div>
            <div>
              <label for="edit-shipping" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">預設送貨地址</label>
              <textarea
                id="edit-shipping"
                v-model="form.shipping_address"
                rows="2"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 resize-none"
                placeholder="請輸入送貨地址"
              ></textarea>
            </div>
            <div>
              <label for="edit-billing" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">預設帳單地址</label>
              <textarea
                id="edit-billing"
                v-model="form.billing_address"
                rows="2"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 resize-none"
                placeholder="請輸入帳單地址"
              ></textarea>
            </div>

            <!-- Error -->
            <p v-if="saveError" class="text-sm text-red-500">{{ saveError }}</p>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                @click="cancelEdit"
                :disabled="saving"
                class="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
              >
                <div v-if="saving" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                {{ saving ? '儲存中…' : '儲存變更' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Toast Message -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div
            v-if="toastMessage"
            class="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-emerald-500"
          >
            ✓ {{ toastMessage }}
          </div>
        </Transition>

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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'

const router = useRouter()
const authStore = useAuthStore()

// --- 編輯模式狀態 ---
const isEditing = ref(false)
const saving = ref(false)
const saveError = ref('')
const toastMessage = ref('')

// 表單資料 (使用 reactive，讀取時不加 .value)
const form = reactive({
  user_name: '',
  phone: '',
  company_name: '',
  tax_id: '',
  shipping_address: '',
  billing_address: '',
})

// 將 Store 資料同步到表單
function syncFormWithStore() {
  const c = authStore.customer || {}
  form.user_name = c.user_name || ''
  form.phone = c.phone || ''
  form.company_name = c.company_name || ''
  form.tax_id = c.tax_id || ''
  form.shipping_address = c.shipping_address || ''
  form.billing_address = c.billing_address || ''
}

// 檢查表單內容是否與 Store 不同 (逐一比對欄位)
function hasFormChanged() {
  const c = authStore.customer || {}
  return (
    form.user_name !== (c.user_name || '') ||
    form.phone !== (c.phone || '') ||
    form.company_name !== (c.company_name || '') ||
    form.tax_id !== (c.tax_id || '') ||
    form.shipping_address !== (c.shipping_address || '') ||
    form.billing_address !== (c.billing_address || '')
  )
}

let toastTimeout

function showToast(message) {
  toastMessage.value = message
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

function enterEditMode() {
  syncFormWithStore()
  saveError.value = ''
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  saveError.value = ''
  syncFormWithStore()
}

async function handleSave() {
  saveError.value = ''

  if (!hasFormChanged()) {
    isEditing.value = false
    return
  }

  saving.value = true

  try {
    const result = await authStore.updateCustomerProfile({ ...form })

    if (result.success) {
      isEditing.value = false
      showToast('資料已更新')
    } else if (result.needLogin) {
      await router.replace('/login')
    } else {
      saveError.value = result.error || '儲存失敗'
    }
  } catch (error) {
    saveError.value = '發生未知的錯誤'
    console.error(error)
  } finally {
    saving.value = false
  }
}

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