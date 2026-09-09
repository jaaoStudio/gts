import { defineStore } from 'pinia'
import { settingsService } from '../services/settingsService'

// 識別類（logo / favicon / 站名）已改為本地常數，見 config/site.js。
// 此 store 只保留會變動、需由後台維護的設定（目前為 LINE ID）。
export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null,
        loading: false,
        loaded: false,

        // 匯款資訊分開存：它只有登入客戶讀得到，不能混進全站都會呼叫的 getSettings()
        payment: null,
        paymentLoaded: false,
    }),

    getters: {
        lineId: (s) => s.settings?.lineId || null,

        /** 匯款資訊。三個欄位缺任一就視為未設定，避免顯示不完整的收款方式 */
        bankInfo: (s) => {
            const { bankName, bankAccount, bankAccountName } = s.payment || {}
            if (!bankName || !bankAccount || !bankAccountName) return null
            return { bankName, bankAccount, bankAccountName }
        },

        /**
         * 運費規則。缺任一值就回 null，訂購單頁據此整行不渲染運費——
         * 與 bankInfo 同慣例：寧可少顯示一行，也不要顯示不完整或猜出來的金額。
         *
         * 不在這裡填寫死的預設值：那會讓「後台把值清空」看起來像正常運作，
         * 設定頁因此變成騙人的。
         */
        shippingRule: (s) => {
            const fee = s.settings?.defaultShippingFee ?? null
            const threshold = s.settings?.freeShippingThreshold ?? null
            if (fee == null || threshold == null) return null

            // 運費 0 不是支援的設定。全站免運促銷沒有人要求過，做出來只是憑空多三處
            // 分支；但也不能讓 0 直接落到收費那條路——那會渲染成「NT$0，再買
            // NT$1,900 免運」，金額沒錯而加購提示在騙人。當作未設定最安全：整行不
            // 顯示，退回加運費之前的畫面。真要辦免運促銷時再刻意實作。
            if (fee <= 0 || threshold <= 0) return null

            return { fee, threshold }
        },

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

        /**
         * 讀取匯款資訊（有快取）。僅登入客戶有權限，
         * 因此只在真的要顯示的地方呼叫——目前是「待付款」的訂購單明細。
         */
        async fetchPaymentInfo() {
            if (this.paymentLoaded) return this.payment

            try {
                this.payment = await settingsService.getPaymentInfo()
                this.paymentLoaded = true
            } catch (err) {
                // 沒設定或無權限時讓 bankInfo 維持 null，明細頁會提示改用電話聯絡
                console.error('Error loading payment info:', err)
            }
            return this.payment
        },
    },
})
