import { defineStore } from 'pinia'
import directus from '../utils/directus'
import { readMe, readItems } from '@directus/sdk'
import { customerService } from '../services/customerService'

/**
 * 認證狀態管理
 * 使用 Directus SSO (Google OAuth) + session 模式：
 * credential 為 Directus 設定的 httpOnly session cookie，前端不持有 access token，
 * 登入狀態以「是否取得到 user」為準（token 不在 JS/localStorage）。
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        customer: null,
        initialized: false, // init() 是否已跑完（冪等，避免各元件重複觸發）
        loading: false,
        error: null,

        // 進行中的 init() promise。initialized 要到 finally 才變 true，光靠它擋不住
        // 「請求還飛在半空中時的第二次呼叫」——那段空窗剛好就是首次導航會落進去的地方。
        _initPromise: null,
    }),

    getters: {
        // session 模式：以是否取得到 user 判斷登入態
        isAuthenticated: (state) => !!state.user,
        isAdmin: (state) => state.user?.role?.admin_access === true,
        /** 根據角色回傳登入後應導向的路由 */
        accountRoute: (state) =>
            state.user?.role?.admin_access === true ? '/admin' : '/account',
        userName: (state) => {
            if (state.customer?.user_name) return state.customer.user_name
            if (!state.user) return ''
            return state.user.first_name
                ? `${state.user.first_name} ${state.user.last_name || ''}`.trim()
                : state.user.email
        },
        userAvatar: (state) => {
            if (!state.user || !state.user.avatar) return null
            const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL || import.meta.env.VITE_DIRECTUS_URL || '/api'
            return `${publicUrl}/assets/${state.user.avatar}`
        },
    },

    actions: {
        getGoogleLoginUrl() {
            const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL
            const callbackUrl = `${window.location.origin}/admin/callback`
            return `${publicUrl}/auth/login/google?redirect=${encodeURIComponent(callbackUrl)}`
        },

        /**
         * SSO 導回：Directus 已在 redirect 時設好 session cookie，
         * 這裡直接抓 user；抓得到即代表 session 有效。
         */
        async handleCallback() {
            this.loading = true
            this.error = null
            try {
                await this.fetchCurrentUser({ force: true })
                if (!this.user) throw new Error('no active session after callback')
                return true
            } catch (err) {
                console.error('SSO callback error:', err)
                this.error = '登入失敗，請重試'
                this.clearAuth()
                return false
            } finally {
                this.loading = false
            }
        },

        async fetchCurrentUser({ force = false } = {}) {
            if (!force && this.user && this.customer) return this.user

            this.loading = true
            try {
                const userData = await directus.request(readMe({
                    fields: ['*', 'role.*']
                }))

                this.user = userData
                await this.fetchCustomerProfile(this.user.id)
                return this.user
            } catch (err) {
                // 未登入 / session 失效 → 視為登出狀態（正常情況，不需噴錯）
                this.user = null
                this.customer = null
                return null
            } finally {
                this.loading = false
            }
        },

        async fetchCustomerProfile(userId) {
            try {
                const customers = await directus.request(readItems('customers', {
                    filter: { user_id: { _eq: userId } },
                    limit: 1
                }))

                this.customer = customers.length > 0 ? customers[0] : null
                return this.customer
            } catch (err) {
                this.customer = null
                return null
            }
        },

        /**
         * 更新會員資料（session cookie 由瀏覽器自動夾帶；SDK autoRefresh 會先嘗試刷新 session）
         * @param {object} data - 要更新的欄位
         * @returns {Promise<{success: boolean, error?: string, needLogin?: boolean}>}
         */
        async updateCustomerProfile(data) {
            if (!this.customer?.id) return { success: false, error: '找不到會員資料' }

            try {
                const updated = await customerService.updateProfile(this.customer.id, data)
                this.customer = { ...this.customer, ...updated }
                return { success: true }
            } catch (err) {
                const code = err?.errors?.[0]?.extensions?.code
                // session 失效（autoRefresh 也救不回）→ 導去重新登入
                if (code === 'INVALID_CREDENTIALS' || code === 'TOKEN_EXPIRED') {
                    this.clearAuth()
                    return { success: false, error: '登入已過期，請重新登入', needLogin: true }
                }
                // FORBIDDEN = session 有效但無權限修改此資料,重登也沒用,不清登入狀態
                if (code === 'FORBIDDEN') {
                    return { success: false, error: '沒有權限修改此資料' }
                }
                console.error('Update customer error:', err)
                return { success: false, error: '儲存失敗，請稍後再試' }
            }
        },

        async logout() {
            try {
                // session 模式：logout 讓 Directus 清除 server 端 session 並過期 cookie
                await directus.logout()
            } catch (err) {
                console.error('Logout error:', err)
            } finally {
                this.clearAuth()
            }
        },

        clearAuth() {
            this.user = null
            this.customer = null
        },

        /**
         * 冪等：只在首次進入點跑一次；各元件 onMounted 或路由守衛再呼叫都不會重打 API。
         *
         * 用 in-flight 的 promise 本身當旗標，而不是只看 `initialized`——後者要到
         * finally 才設為 true，檢查與設旗標之間隔著一整段 await，是典型的
         * check-then-act 空窗。main.js 先 `app.use(router)` 觸發首次導航，才呼叫
         * init()，守衛的動態 import 解析完時請求正在飛，`initialized` 還是 false，
         * 少了這層就會多打一次 /users/me。
         */
        async init() {
            if (this.initialized) return
            if (this._initPromise) return this._initPromise

            this._initPromise = (async () => {
                this.loading = true
                try {
                    // session cookie 由瀏覽器夾帶；抓得到 user 即已登入，抓不到即匿名
                    await this.fetchCurrentUser({ force: true })
                } finally {
                    this.initialized = true
                    this.loading = false
                    this._initPromise = null
                }
            })()

            return this._initPromise
        },
    }
})
