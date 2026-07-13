<template>
  <div class="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
    <nav
      class="pointer-events-auto mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-white/60 bg-white/75 px-2 pl-3 shadow-[0_10px_40px_-16px_rgba(16,17,21,0.28)] ring-1 ring-steel-900/[0.05] backdrop-blur-xl sm:h-16 sm:pl-4"
    >
      <!-- Logo -->
      <router-link to="/" class="group flex flex-shrink-0 items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-steel-900 text-brand-500 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-[-8deg]">
          <PhWrench :size="20" weight="fill" />
        </span>
        <span class="font-display text-lg font-bold tracking-tight text-steel-900">GTS</span>
      </router-link>

      <!-- Desktop nav -->
      <div class="ml-2 hidden items-center gap-1 lg:flex">
        <div class="group/menu relative">
          <button class="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900">
            商品專區
            <PhCaretDown :size="14" weight="bold" class="transition-transform duration-300 group-hover/menu:rotate-180" />
          </button>

          <!-- Mega panel -->
          <div
            class="invisible absolute left-0 top-full w-[44rem] max-w-[calc(100vw-2rem)] translate-y-2 pt-3 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100"
          >
            <div class="max-h-[calc(100dvh-6rem)] overflow-y-auto scrollbar-hide rounded-3xl border border-steel-100 bg-white/95 p-3 shadow-[0_30px_60px_-24px_rgba(16,17,21,0.35)] backdrop-blur-xl">
              <div v-if="categoryTree.length === 0" class="px-4 py-6 text-sm text-steel-400">載入分類中…</div>
              <div v-else class="grid grid-cols-3 gap-1">
                <div v-for="category in categoryTree" :key="category.id" class="rounded-2xl p-2 transition-colors hover:bg-steel-50">
                  <router-link
                    :to="{ path: '/products', query: { category: category.slug } }"
                    class="flex items-center gap-2 px-2 py-1 font-display text-sm font-semibold text-steel-900 hover:text-brand-600"
                  >
                    {{ category.name }}
                  </router-link>
                  <div v-if="category.children?.length" class="mt-1 flex flex-col">
                    <router-link
                      v-for="child in category.children"
                      :key="child.id"
                      :to="{ path: '/products', query: { category: child.slug } }"
                      class="rounded-lg px-2 py-1 text-[13px] text-steel-500 transition-colors hover:text-brand-600"
                    >
                      {{ child.name }}
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <router-link to="/products" class="rounded-full px-3.5 py-2 text-sm font-medium text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900">
          所有商品
        </router-link>
      </div>

      <!-- Right cluster -->
      <div class="ml-auto flex items-center gap-1">
        <!-- Search (desktop) -->
        <div class="relative hidden md:block">
          <PhMagnifyingGlass :size="16" weight="bold" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="搜尋工具、五金…"
            class="w-44 rounded-full border border-transparent bg-steel-100 py-2 pl-9 pr-4 text-sm text-steel-900 placeholder-steel-400 transition-all duration-300 focus:w-56 focus:border-brand-500/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15 lg:w-52"
          />
        </div>

        <!-- Search (mobile) -->
        <button
          @click="mobileSearchOpen = !mobileSearchOpen"
          class="flex h-10 w-10 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900 md:hidden"
          aria-label="搜尋"
        >
          <PhMagnifyingGlass :size="20" weight="regular" />
        </button>

        <!-- User -->
        <div class="relative" ref="userMenuRef">
          <router-link
            v-if="!authStore.isAuthenticated"
            to="/login"
            class="flex h-10 w-10 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900"
            title="登入"
          >
            <PhUser :size="20" weight="regular" />
          </router-link>

          <button
            v-else
            @click="userMenuOpen = !userMenuOpen"
            class="flex items-center rounded-full p-0.5 ring-1 ring-transparent transition-all hover:ring-brand-500/40"
          >
            <img v-if="authStore.userAvatar" :src="authStore.userAvatar" :alt="authStore.userName" class="h-8 w-8 rounded-full object-cover" />
            <span v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-steel-900 text-sm font-semibold text-white">
              {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
            </span>
          </button>

          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-1 opacity-0"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-y-1 opacity-0"
          >
            <div
              v-if="userMenuOpen && authStore.isAuthenticated"
              class="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-steel-100 bg-white/95 py-1.5 shadow-[0_24px_50px_-20px_rgba(16,17,21,0.35)] backdrop-blur-xl"
            >
              <div class="border-b border-steel-100 px-4 py-3">
                <p class="truncate font-display text-sm font-semibold text-steel-900">{{ authStore.userName }}</p>
                <p class="truncate font-mono text-xs text-steel-400">{{ authStore.user?.email }}</p>
              </div>
              <router-link :to="authStore.accountRoute" @click="userMenuOpen = false" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-steel-600 transition-colors hover:bg-steel-50 hover:text-steel-900">
                <PhUserCircle :size="18" weight="regular" /> 我的帳戶
              </router-link>
              <button @click="handleLogout" class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-brand-600 transition-colors hover:bg-brand-50">
                <PhSignOut :size="18" weight="regular" /> 登出
              </button>
            </div>
          </transition>
        </div>

        <!-- Cart -->
        <button class="relative flex h-10 w-10 items-center justify-center rounded-full text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900" aria-label="購物車">
          <PhShoppingCartSimple :size="20" weight="regular" />
          <span class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 font-mono text-[10px] font-bold text-white">0</span>
        </button>

        <!-- Hamburger -->
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="relative flex h-10 w-10 items-center justify-center rounded-full text-steel-700 transition-colors hover:bg-steel-100 lg:hidden"
          aria-label="選單"
        >
          <span class="relative block h-4 w-5">
            <span
              class="absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              :class="mobileMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0.5'"
            />
            <span
              class="absolute bottom-0.5 left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              :class="mobileMenuOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : ''"
            />
          </span>
        </button>
      </div>
    </nav>

    <!-- Mobile search -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div v-if="mobileSearchOpen" class="pointer-events-auto mx-auto mt-2 max-w-6xl md:hidden">
        <div class="relative">
          <PhMagnifyingGlass :size="18" weight="bold" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="搜尋工具、五金…"
            class="w-full rounded-full border border-steel-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-steel-900 placeholder-steel-400 shadow-lg backdrop-blur-xl focus:border-brand-500/40 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
      </div>
    </transition>

    <!-- Mobile full-screen menu -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="mobileMenuOpen" class="pointer-events-auto fixed inset-0 top-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-steel-50/85 backdrop-blur-2xl" @click="mobileMenuOpen = false" />
        <div class="relative flex h-[100dvh] flex-col overflow-y-auto px-6 pb-10 pt-24">
          <router-link
            to="/products"
            @click="closeMobile"
            class="mobile-link font-display text-3xl font-semibold text-steel-900"
            :style="linkDelay(0)"
          >
            所有商品
          </router-link>

          <div class="mt-8">
            <p class="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-steel-400">商品分類</p>
            <div class="flex flex-col gap-1">
              <div v-for="(category, i) in categoryTree" :key="category.id" class="mobile-link" :style="linkDelay(i + 1)">
                <router-link
                  :to="{ path: '/products', query: { category: category.slug } }"
                  @click="closeMobile"
                  class="block py-2 font-display text-xl font-medium text-steel-800 hover:text-brand-600"
                >
                  {{ category.name }}
                </router-link>
                <div v-if="category.children?.length" class="ml-3 flex flex-wrap gap-x-4 gap-y-1 border-l border-steel-200 pl-3">
                  <router-link
                    v-for="child in category.children"
                    :key="child.id"
                    :to="{ path: '/products', query: { category: child.slug } }"
                    @click="closeMobile"
                    class="py-1 text-sm text-steel-500 hover:text-brand-600"
                  >
                    {{ child.name }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-auto border-t border-steel-200 pt-6">
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/login"
              @click="closeMobile"
              class="flex items-center gap-3 font-display text-lg font-medium text-steel-900"
            >
              <PhUser :size="22" weight="regular" /> 登入 / 註冊
            </router-link>
            <template v-else>
              <div class="mb-4 flex items-center gap-3">
                <img v-if="authStore.userAvatar" :src="authStore.userAvatar" class="h-10 w-10 rounded-full object-cover" />
                <span v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-steel-900 font-semibold text-white">
                  {{ authStore.userName?.charAt(0)?.toUpperCase() || '?' }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-display font-semibold text-steel-900">{{ authStore.userName }}</p>
                  <p class="truncate font-mono text-xs text-steel-400">{{ authStore.user?.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <router-link :to="authStore.accountRoute" @click="closeMobile" class="text-sm font-medium text-steel-700">我的帳戶</router-link>
                <button @click="handleLogout" class="text-sm font-medium text-brand-600">登出</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '../stores/category'
import { useAuthStore } from '../stores/auth'
import {
  PhWrench, PhCaretDown, PhMagnifyingGlass, PhUser, PhUserCircle,
  PhSignOut, PhShoppingCartSimple,
} from '@phosphor-icons/vue'

const router = useRouter()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const mobileMenuOpen = ref(false)
const mobileSearchOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref(null)

const categoryTree = computed(() => categoryStore.categoryTree)

const linkDelay = (i) => ({ '--d': `${i * 45}ms` })

onMounted(() => {
  categoryStore.fetchCategories()
  authStore.init()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.body.style.overflow = ''
})

// Lock body scroll while the full-screen menu is open
watch(mobileMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}

function closeMobile() {
  mobileMenuOpen.value = false
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    mobileMenuOpen.value = false
    mobileSearchOpen.value = false
    router.push({ path: '/products', query: { search: searchQuery.value.trim() } })
  }
}

async function handleLogout() {
  userMenuOpen.value = false
  mobileMenuOpen.value = false
  await authStore.logout()
  router.push('/')
}
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .mobile-link {
    opacity: 0;
    transform: translateY(1rem);
    animation: mobile-in 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    animation-delay: var(--d, 0ms);
  }
  @keyframes mobile-in {
    to { opacity: 1; transform: translateY(0); }
  }
}
</style>
