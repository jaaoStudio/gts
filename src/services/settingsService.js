import { readSingleton } from '@directus/sdk'
import directus from '../utils/directus'

/**
 * 網站設定服務 - 讀取 Directus 的 site_settings 單例。
 * 識別類（logo / favicon / 站名）已本地化，見 config/site.js；此處只取會變動的設定。
 */
export const settingsService = {
    async getSettings() {
        const data = await directus.request(
            readSingleton('site_settings', {
                fields: [
                    'line_id',
                    // 匯款資訊只在「待付款」的訂購單明細顯示，不放在任何公開頁面
                    'bank_name', 'bank_account', 'bank_account_name',
                    'free_shipping_threshold', 'default_shipping_fee',
                ],
            })
        )

        return {
            lineId: data?.line_id || null,
            bankName: data?.bank_name || null,
            bankAccount: data?.bank_account || null,
            bankAccountName: data?.bank_account_name || null,
            freeShippingThreshold: data?.free_shipping_threshold ?? null,
            defaultShippingFee: data?.default_shipping_fee ?? null,
        }
    },
}
