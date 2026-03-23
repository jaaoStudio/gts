import { defineStore } from 'pinia'
import directus from '../utils/directus'
import { readMe, readItems, logout } from '@directus/sdk'
import axios from "axios";

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
            const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL || 'https://gts-core.jaao.tw'
            const callbackUrl = `${window.location.origin}/admin/callback`
            return `${publicUrl}/auth/login/google?redirect=${encodeURIComponent(callbackUrl)}`
        },

        async handleCallback() {
            this.loading = true
            this.error = null

            try {
                // 1. 保留你原本的邏輯：去 Public URL 拿 Cookie 換 Token
                const publicUrl = import.meta.env.VITE_DIRECTUS_PUBLIC_URL || 'https://gts-core.jaao.tw'
                const response = await axios.post(`${publicUrl}/auth/refresh`, {}, {
                    withCredentials: true,
                })

                const accessToken = response.data.data.access_token

                // 2. 將拿到的 Token 餵給 SDK 接管！
                await directus.setToken(accessToken)

                // 3. 備份到 localStorage (維持你原本的習慣)
                this._saveTokens(accessToken)

                // 4. 去抓使用者資料
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
            // 同步清除 SDK 內的 Token
            directus.setToken(null)
        },
        async init() {
            // 網頁重新整理時，把 localStorage 的 token 塞回 SDK
            if (this.accessToken) {
                await directus.setToken(this.accessToken)
                this.loading = true
                try {
                    await this.fetchCurrentUser()
                } finally {
                    this.loading = false
                }
            }
        },
    }
})
