import { readSingleton } from '@directus/sdk'
import directus, { getAssetUrl } from '../utils/directus'

/**
 * 網站設定服務 - 讀取 Directus 的 site_settings 單例
 */
export const settingsService = {
    async getSettings() {
        const data = await directus.request(
            readSingleton('site_settings', {
                fields: ['site_name', 'logo', 'logo_dark', 'favicon', 'line_id'],
            })
        )

        return {
            siteName: data?.site_name || 'GTS',
            logo: data?.logo ? getAssetUrl(data.logo) : null,
            logoDark: data?.logo_dark ? getAssetUrl(data.logo_dark) : null,
            favicon: data?.favicon ? getAssetUrl(data.favicon) : null,
            lineId: data?.line_id || null,
        }
    },
}
