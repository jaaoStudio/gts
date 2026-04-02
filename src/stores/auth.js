import { defineStore } from 'pinia'
import directus from '../utils/directus'
import { readMe, readItems, logout } from '@directus/sdk'
import axios from "axios";
import { customerService } from '../services/customerService'

/**
 * 認證狀態管理
 * 使用 Directus SSO (Google OAuth) 進行認證
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        customer: null,
        accessToken: localStorage.getItem('auth_access_token') || null,
        loading: false,
        error: null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.accessToken,
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

        async handleCallback() {
            this.loading = true
            this.error = null

            try {
                const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL
                const response = await axios.post(`${publicUrl}/auth/refresh`, {}, {
                    withCredentials: true,
                })

                const accessToken = response.data.data.access_token

                await directus.setToken(accessToken)

                this._saveTokens(accessToken)

                await this.fetchCurrentUser()
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

        async fetchCurrentUser() {
            if (this.user && this.customer) return this.user;

            this.loading = true;
            try {
                const userData = await directus.request(readMe({
                    fields: ['*', 'role.*']
                }));

                this.user = userData;
                await this.fetchCustomerProfile(this.user.id);
                return this.user;
            } catch (err) {
                console.error('Fetch user error:', err);
                this.clearAuth();
                return null;
            } finally {
                this.loading = false;
            }
        },

        async fetchCustomerProfile(userId) {
            try {
                const customers = await directus.request(readItems('customers', {
                    filter: { user_id: { _eq: userId } },
                    limit: 1
                }));

                this.customer = customers.length > 0 ? customers[0] : null;
                return this.customer;
            } catch (err) {
                this.customer = null;
                return null;
            }
        },

        /**
         * 更新會員資料（Token 過期時會自動刷新並重試一次）
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
                // Token 過期 → 嘗試靜默刷新並重試
                if (err?.response?.status === 401 || err?.response?.status === 403) {
                    try {
                        const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL
                        const res = await axios.post(`${publicUrl}/auth/refresh`, {}, { withCredentials: true })
                        const newToken = res.data.data.access_token
                        await directus.setToken(newToken)
                        this._saveTokens(newToken)

                        // 用新 token 重試儲存
                        const updated = await customerService.updateProfile(this.customer.id, data)
                        this.customer = { ...this.customer, ...updated }
                        return { success: true }
                    } catch (refreshErr) {
                        console.warn('Token refresh failed during save:', refreshErr.message)
                        this.clearAuth()
                        return { success: false, error: '登入已過期，請重新登入', needLogin: true }
                    }
                }

                console.error('Update customer error:', err)
                return { success: false, error: '儲存失敗，請稍後再試' }
            }
        },

        async logout() {
            try {
                // 使用 SDK 原生的登出
                await directus.request(logout());
            } catch (err) {
                console.error('Logout error:', err)
            } finally {
                this.clearAuth()
            }
        },

        _saveTokens(accessToken) {
            this.accessToken = accessToken
            localStorage.setItem('auth_access_token', accessToken)
        },

        clearAuth() {
            this.accessToken = null
            this.user = null
            this.customer = null
            localStorage.removeItem('auth_access_token')
            directus.setToken(null)
        },
        async init() {
            if (!this.accessToken) return

            this.loading = true
            try {
                // 1. 先嘗試用 localStorage 的現有 token
                await directus.setToken(this.accessToken)
                await this.fetchCurrentUser()
            } catch (firstErr) {
                // 2. Token 過期，嘗試用 cookie 刷新
                try {
                    const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL
                    const response = await axios.post(`${publicUrl}/auth/refresh`, {}, {
                        withCredentials: true,
                    })
                    const newToken = response.data.data.access_token
                    await directus.setToken(newToken)
                    this._saveTokens(newToken)
                    await this.fetchCurrentUser()
                } catch (refreshErr) {
                    // 3. 兩種方式都失敗，才清除登入狀態
                    console.warn('Auth init failed:', refreshErr.message)
                    this.clearAuth()
                }
            } finally {
                this.loading = false
            }
        },
    }
})
