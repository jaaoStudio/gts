import { defineStore } from 'pinia'
import { settingsService } from '../services/settingsService'

// 識別類（logo / favicon / 站名）已改為本地常數，見 config/site.js。
// 此 store 只保留會變動、需由後台維護的設定（目前為 LINE ID）。
export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null,
        loading: false,
        loaded: false,
    }),

    getters: {
        lineId: (s) => s.settings?.lineId || null,

        /** 匯款資訊。三個欄位缺任一就視為未設定，避免顯示不完整的收款方式 */
        bankInfo: (s) => {
            const { bankName, bankAccount, bankAccountName } = s.settings || {}
            if (!bankName || !bankAccount || !bankAccountName) return null
            return { bankName, bankAccount, bankAccountName }
        },

        freeShippingThreshold: (s) => s.settings?.freeShippingThreshold ?? null,

        // 組出加好友連結：完整網址（lin.ee / line.me）直接用，否則當官方帳號 @id
        lineUrl: (s) => {
            const id = s.settings?.lineId
            if (!id) return null
            if (/^https?:\/\//.test(id)) return id
            return `https://line.me/R/ti/p/@${String(id).replace(/^@/, '')}`
        },
    },

    actions: {
        /**
         * 讀取網站設定（有快取，只會呼叫一次）
         */
        async fetchSettings() {
            if (this.loaded || this.loading) return this.settings

            this.loading = true
            try {
                this.settings = await settingsService.getSettings()
                this.loaded = true
            } catch (err) {
                console.error('Error loading site settings:', err)
            } finally {
                this.loading = false
            }
            return this.settings
        },
    },
})
