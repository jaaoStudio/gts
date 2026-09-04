import { createItem, readItems, readItem, updateItem } from '@directus/sdk'
import directus from '../utils/directus'

// 明細與列表共用。confirmed_* 是老闆確認後的值，客人要看得到才知道實際應付多少。
const ORDER_FIELDS = [
    'id', 'order_number', 'status', 'date_created',
    'contact_name', 'contact_phone', 'contact_address', 'note',
    'subtotal', 'has_quote_items',
    'shipping_fee', 'discount', 'confirmed_total',
    'payment_note', 'paid_at',
    'shipping_method', 'tracking_number', 'shipped_at',
    'items.id', 'items.product_name', 'items.spec_name', 'items.sku',
    'items.quantity', 'items.unit_price', 'items.confirmed_price',
]

/**
 * 訂購單服務。
 *
 * 讀取一律不帶 customer 條件——Directus 的 `customer access` policy 已用
 * `customer.user_id = $CURRENT_USER` 過濾，權限由後端把關，前端不重複實作。
 */
export const orderService = {
    /**
     * 建立訂購單（含品項，nested create）。
     *
     * ⚠️ 回傳的物件**不會有 order_number**：單號由 `items.create` 的 action flow
     * 事後補上，而 action flow 不阻斷回應。呼叫端請改用 waitForOrderNumber()。
     */
    async createOrder({ customerId, contactName, contactPhone, contactAddress, note, items }) {
        return directus.request(createItem('orders', {
            customer: customerId,
            contact_name: contactName || null,
            contact_phone: contactPhone || null,
            contact_address: contactAddress || null,
            note: note || null,
            items: items.map((it) => ({
                variant: it.variantId,
                product_name: it.productName,
                spec_name: it.specName || null,
                sku: it.sku || null,
                // null 代表下單當時為詢價，不可寫 0
                unit_price: it.unitPrice ?? null,
                quantity: it.quantity,
            })),
        }, { fields: ['id'] }))
    },

    /**
     * 輪詢等待 Flow 補上單號。取不到就回 null，由呼叫端改用 id 顯示，
     * 不要因為單號還沒好就讓客人以為送出失敗。
     */
    async waitForOrderNumber(orderId, { attempts = 6, intervalMs = 400 } = {}) {
        for (let i = 0; i < attempts; i++) {
            const order = await directus.request(
                readItem('orders', orderId, { fields: ['order_number'] })
            )
            if (order?.order_number) return order.order_number
            await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }
        return null
    },

    async getMyOrders() {
        return directus.request(readItems('orders', {
            fields: ORDER_FIELDS,
            sort: ['-date_created'],
            limit: -1,
        }))
    },

    async getOrder(orderId) {
        return directus.request(readItem('orders', orderId, { fields: ORDER_FIELDS }))
    },

    /**
     * 客人回報已匯款。權限上只開放 payment_note 一個欄位，
     * 且限定 status = quoted——狀態改由老闆按「確認收款」推進。
     */
    async reportPayment(orderId, lastFiveDigits) {
        return directus.request(updateItem('orders', orderId, {
            payment_note: lastFiveDigits,
        }, { fields: ['id', 'payment_note'] }))
    },
}

/** 狀態的中文標籤與說明，前台顯示用 */
export const ORDER_STATUS = {
    pending: { label: '待確認', hint: '我們已收到您的訂購單，將盡快與您確認價格與庫存。' },
    quoted: { label: '待付款', hint: '金額已確認，請依下方資訊完成匯款。' },
    paid: { label: '已付款', hint: '款項已確認，正在為您準備出貨。' },
    shipped: { label: '已出貨', hint: '商品已寄出，可用下方單號查詢。' },
    cancelled: { label: '已取消', hint: '此訂購單已取消。' },
}
