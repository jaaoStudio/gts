import { readSingleton } from '@directus/sdk'
import directus from '../utils/directus'

/**
 * 網站設定服務 - 讀取 Directus 的 site_settings 單例。
 * 識別類（logo / favicon / 站名）已本地化，見 config/site.js；此處只取會變動的設定。
 */
export const settingsService = {
    /**
     * 全站通用設定。**只能放匿名可讀的欄位**——這支會在 Footer / LineButton 等
     * 未登入也會出現的元件被呼叫，夾帶任何受限欄位都會讓整個請求 403，
     * 連 LINE 按鈕都會一起消失。
     */
    async getSettings() {
        const data = await directus.request(
            readSingleton('site_settings', {
                fields: ['line_id', 'free_shipping_threshold', 'default_shipping_fee'],
            })
        )

        return {
            lineId: data?.line_id || null,
            freeShippingThreshold: data?.free_shipping_threshold ?? null,
            defaultShippingFee: data?.default_shipping_fee ?? null,
        }
    },

    /**
     * 匯款資訊。**僅登入客戶可讀**（public policy 已排除這三個欄位），
     * 所以只在需要顯示的地方呼叫——目前是「待付款」狀態的訂購單明細。
     */
    async getPaymentInfo() {
        const data = await directus.request(
            readSingleton('site_settings', {
                fields: ['bank_name', 'bank_account', 'bank_account_name'],
            })
        )

        return {
            bankName: data?.bank_name || null,
            bankAccount: data?.bank_account || null,
            bankAccountName: data?.bank_account_name || null,
        }
    },
}
