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
                fields: ['line_id'],
            })
        )

        return {
            lineId: data?.line_id || null,
        }
    },
}
