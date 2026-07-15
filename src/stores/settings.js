import { defineStore } from 'pinia'
import { settingsService } from '../services/settingsService'

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null,
        loading: false,
        loaded: false,
    }),

    getters: {
        siteName: (s) => s.settings?.siteName || 'GTS',
        logo: (s) => s.settings?.logo || null,
        logoDark: (s) => s.settings?.logoDark || null,
        favicon: (s) => s.settings?.favicon || null,
        lineId: (s) => s.settings?.lineId || null,
    },

    actions: {
        /**
         * 讀取網站設定（有快取，只會呼叫一次），並套用 favicon / title
         */
        async fetchSettings() {
            if (this.loaded || this.loading) return this.settings

            this.loading = true
            try {
                this.settings = await settingsService.getSettings()
                this.loaded = true
                this.applyHead()
            } catch (err) {
                console.error('Error loading site settings:', err)
            } finally {
                this.loading = false
            }
            return this.settings
        },

        /**
         * 把 favicon 與網站標題套到 <head>
         */
        applyHead() {
            if (this.favicon) {
                let link = document.querySelector("link[rel~='icon']")
                if (!link) {
                    link = document.createElement('link')
                    link.rel = 'icon'
                    document.head.appendChild(link)
                }
                link.href = this.favicon
            }
            if (this.siteName) document.title = this.siteName
        },
    },
})
