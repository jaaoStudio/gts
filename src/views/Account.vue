<template>
  <div class="min-h-[100dvh] bg-steel-50">
    <Navbar />

    <main class="mx-auto max-w-3xl px-5 pb-24 pt-24 sm:px-8">
      <!-- Loading -->
      <div v-if="authStore.loading" class="flex justify-center py-24">
        <PhCircleNotch :size="36" weight="bold" class="animate-spin text-brand-500" />
      </div>

      <!-- Profile -->
      <div v-else-if="authStore.user" class="space-y-6">
        <!-- Header card -->
        <div class="relative overflow-hidden rounded-[2rem] bg-steel-900 p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] sm:p-8">
          <div class="pointer-events-none absolute inset-0 bg-blueprint opacity-20" />
          <div class="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />

          <div class="relative flex items-center gap-5">
            <img
              v-if="authStore.userAvatar"
              :src="authStore.userAvatar"
              :alt="authStore.userName"
              class="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-white/20 sm:h-24 sm:w-24"
            />
            <div v-else class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-3xl font-bold text-white shadow-lg ring-2 ring-white/20 sm:h-24 sm:w-24">
              {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
            </div>

            <div class="min-w-0">
              <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-400">會員專區 · Member</p>
              <h1 class="mt-1.5 truncate font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{{ authStore.userName }}</h1>
              <p class="mt-1 truncate font-mono text-sm text-steel-400">{{ authStore.user.email }}</p>
            </div>
          </div>
        </div>

        <!-- Orders entry -->
        <router-link
          to="/account/orders"
          class="group mb-6 flex items-center gap-4 rounded-[1.5rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-steel-300 sm:p-8"
        >
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-steel-100">
            <PhReceipt :size="22" weight="bold" class="text-steel-700" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-display text-lg font-semibold text-steel-900">我的訂購單</h2>
            <p class="mt-0.5 text-sm text-steel-500">查看訂購進度、應付金額與出貨狀態</p>
          </div>
          <PhCaretRight
            :size="18"
            weight="bold"
            class="text-steel-300 transition-colors group-hover:text-steel-900"
          />
        </router-link>

        <!-- Info card -->
        <div class="rounded-[1.5rem] bg-white p-6 ring-1 ring-steel-900/[0.06] shadow-[0_1px_2px_rgba(16,17,21,0.04)] sm:p-8">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="font-display text-lg font-semibold text-steel-900">帳戶資訊</h2>
            <!-- 沒有會員資料就沒有東西可編輯。留著這顆鈕等於讓客人填完一整張表，
                 才被 updateCustomerProfile() 的「找不到會員資料」擋下來 -->
            <button
              v-if="!isEditing && authStore.customerStatus === 'ready'"
              @click="enterEditMode"
              class="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-4 py-2 text-sm font-medium text-steel-700 transition-colors hover:border-steel-900 hover:text-steel-900"
            >
              <PhPencilSimple :size="15" weight="bold" /> 編輯資料
            </button>
          </div>

          <!-- 會員資料讀取中（整頁 loading 只涵蓋 init()，這裡是按下重試後的那段） -->
          <div v-if="authStore.customerStatus === 'loading'" class="flex justify-center py-10">
            <PhCircleNotch :size="28" weight="bold" class="animate-spin text-brand-500" />
          </div>

          <!-- 讀不到（網路／session）。重試通常就會好，所以給的是重試而不是說明 -->
          <div v-else-if="authStore.customerStatus === 'error'" class="py-6 text-center">
            <PhWarningCircle :size="30" weight="bold" class="mx-auto text-steel-400" />
            <p class="mt-3 text-sm leading-relaxed text-steel-600">
              目前讀不到您的會員資料，您的帳號本身沒有問題。
            </p>
            <button
              type="button"
              class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-4 py-2 text-sm font-medium text-steel-700 transition-colors hover:border-steel-900 hover:text-steel-900"
              @click="authStore.refreshCustomerProfile()"
            >
              重新載入
            </button>
          </div>

          <!-- 讀得到卻沒有資料列。依建檔 flow 的契約每個帳號都該有，所以這是後端壞了，
               客人自己重試或重新登入都救不回來，只能請他找我們 -->
          <div v-else-if="authStore.customerStatus === 'missing'" class="py-6 text-center">
            <PhWarningCircle :size="30" weight="bold" class="mx-auto text-steel-400" />
            <p class="mt-3 text-sm leading-relaxed text-steel-600">
              您的會員資料尚未建立完成，請與我們聯絡，我們會協助您處理。
            </p>
            <router-link
              to="/contact"
              class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-4 py-2 text-sm font-medium text-steel-700 transition-colors hover:border-steel-900 hover:text-steel-900"
            >
              聯絡我們
            </router-link>
          </div>

          <!-- Display mode -->
          <dl v-else-if="!isEditing" class="divide-y divide-steel-100">
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">名稱</dt>
              <dd class="text-sm font-medium text-steel-900">{{ authStore.customer?.user_name || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">Email</dt>
              <dd class="font-mono text-sm font-medium text-steel-900">{{ authStore.user.email }}</dd>
            </div>
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">公司名稱</dt>
              <dd class="text-sm font-medium text-steel-900">{{ authStore.customer?.company_name || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">統一編號</dt>
              <dd class="font-mono text-sm font-medium text-steel-900">{{ authStore.customer?.tax_id || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">電話</dt>
              <dd class="font-mono text-sm font-medium text-steel-900">{{ authStore.customer?.phone || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between py-3">
              <dt class="text-sm text-steel-500">會員等級</dt>
              <dd>
                <span class="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {{ authStore.customer?.customer_level || "會員" }}
                </span>
              </dd>
            </div>
            <div class="py-3">
              <dt class="mb-1 text-sm text-steel-500">預設送貨地址</dt>
              <dd class="text-sm font-medium leading-relaxed text-steel-900">{{ authStore.customer?.shipping_address || '—' }}</dd>
            </div>
            <div class="py-3">
              <dt class="mb-1 text-sm text-steel-500">預設帳單地址</dt>
              <dd class="text-sm font-medium leading-relaxed text-steel-900">{{ authStore.customer?.billing_address || '—' }}</dd>
            </div>
          </dl>

          <!-- Edit mode -->
          <form v-else @submit.prevent="handleSave" class="space-y-5">
            <!-- 儲存期間鎖住整組欄位。handleSave() 送的是 { ...form } 的快照，等待期間
                 打的字不會進到這次請求，成功後表單直接收起——鍵盤輸入就這樣無聲消失。
                 fieldset 一次蓋住六個欄位，比逐個掛 :disabled 少一輪漏改的機會。 -->
            <fieldset :disabled="saving" class="min-w-0 space-y-5 border-0 p-0">
            <div class="flex flex-col gap-2">
              <label for="edit-user-name" class="text-sm font-medium text-steel-700">名稱</label>
              <input
                id="edit-user-name"
                v-model="form.user_name"
                type="text"
                :class="inputClass"
                placeholder="請輸入名稱"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-phone" class="text-sm font-medium text-steel-700">電話</label>
              <input
                id="edit-phone"
                v-model="form.phone"
                type="tel"
                :class="inputClass"
                placeholder="請輸入電話"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-company" class="text-sm font-medium text-steel-700">公司名稱</label>
              <input
                id="edit-company"
                v-model="form.company_name"
                type="text"
                :class="inputClass"
                placeholder="請輸入公司名稱"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-tax-id" class="text-sm font-medium text-steel-700">統一編號</label>
              <input
                id="edit-tax-id"
                v-model="form.tax_id"
                type="text"
                :class="inputClass"
                placeholder="請輸入統一編號"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-shipping" class="text-sm font-medium text-steel-700">預設送貨地址</label>
              <textarea
                id="edit-shipping"
                v-model="form.shipping_address"
                rows="2"
                :class="[inputClass, 'resize-none']"
                placeholder="請輸入送貨地址"
              ></textarea>
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-billing" class="text-sm font-medium text-steel-700">預設帳單地址</label>
              <textarea
                id="edit-billing"
                v-model="form.billing_address"
                rows="2"
                :class="[inputClass, 'resize-none']"
                placeholder="請輸入帳單地址"
              ></textarea>
            </div>
            </fieldset>

            <!-- Error -->
            <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                @click="cancelEdit"
                :disabled="saving"
                class="rounded-full border border-steel-300 px-5 py-2.5 text-sm font-medium text-steel-600 transition-colors hover:border-steel-900 hover:text-steel-900 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="inline-flex items-center gap-2 rounded-full bg-steel-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
              >
                <PhCircleNotch v-if="saving" :size="16" weight="bold" class="animate-spin" />
                {{ saving ? '儲存中…' : '儲存變更' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Toast -->
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
            class="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-steel-900 px-5 py-3 text-sm font-medium text-white shadow-[0_20px_40px_-16px_rgba(16,17,21,0.5)]"
          >
            <PhCheckCircle :size="18" weight="fill" class="text-brand-500" /> {{ toastMessage }}
          </div>
        </Transition>

        <!-- Logout -->
        <div class="flex justify-end">
          <button
            @click="handleLogout"
            class="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-5 py-2.5 text-sm font-medium text-steel-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <PhSignOut :size="16" weight="bold" /> 登出
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
import { PhCircleNotch, PhPencilSimple, PhCheckCircle, PhSignOut,
         PhReceipt, PhCaretRight, PhWarningCircle } from '@phosphor-icons/vue'

const router = useRouter()
const authStore = useAuthStore()

// 共用輸入框樣式（label 在上、focus 用 brand ring，符合全站表單對比）
const inputClass =
  'w-full rounded-xl border border-steel-200 bg-steel-50 px-4 py-2.5 text-sm text-steel-900 placeholder-steel-400 transition-all duration-200 focus:border-brand-500/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:bg-steel-100 disabled:text-steel-400'

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
