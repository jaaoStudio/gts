import directus from '../utils/directus'
import { updateItem } from '@directus/sdk'

/**
 * 允許使用者自行修改的欄位白名單
 */
const EDITABLE_FIELDS = [
    'user_name',
    'phone',
    'company_name',
    'tax_id',
    'shipping_address',
    'billing_address',
]

/**
 * Customer Service — 會員資料 API 操作
 */
export const customerService = {
    /**
     * 更新會員資料
     * @param {string} customerId - customer record UUID
     * @param {object} data - 要更新的欄位（會自動過濾白名單外的欄位）
     * @returns {Promise<object>} 更新後的 customer 資料
     */
    async updateProfile(customerId, data) {
        // 只保留白名單內的欄位，防止覆寫不該改的資料
        const sanitized = {}
        for (const key of EDITABLE_FIELDS) {
            if (key in data) {
                sanitized[key] = data[key]
            }
        }

        return directus.request(updateItem('customers', customerId, sanitized))
    },
}
