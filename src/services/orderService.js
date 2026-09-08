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
     * ⚠️ **刻意不送 `customer`**：該欄位已從客戶端可寫清單移除（送了會 403），
     * 改由 `items.create` 的 action flow 依登入帳號反查後補上。這樣客戶端
     * 無從把訂單掛到別人名下——偽造在寫入端就被擋掉，不會產生需要清理的垃圾單。
     *
     * ⚠️ 回傳的物件**不會有 order_number**，也可能因 `customer` 尚未補上而
     * 讀不回內容（HTTP 204）。單號請改用 waitForNewOrder()。
     */
    async createOrder({ contactName, contactPhone, contactAddress, note, items }) {
        return directus.request(createItem('orders', {
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
     * 目前自己看得到的最大訂單 id，送出前記錄，用來辨識新建的那一筆。
     *
     * ⚠️ **讀取失敗一律往上拋，不要吞成 0**：0 的語意是「這位客人還沒有任何訂單」，
     * 拿它當比對基準會讓 waitForNewOrder() 的 `id > afterId` 對這位客人的**任何一張
     * 舊單**都成立，於是輪詢第一圈就命中舊單，完成頁顯示的是別張單的單號——
     * 而客人會拿那個單號去填匯款備註。失敗要保持成失敗，由呼叫端決定怎麼辦。
     */
    async getLatestOrderId() {
        const [latest] = await directus.request(readItems('orders', {
            fields: ['id'], sort: ['-id'], limit: 1,
        }))
        return latest?.id ?? 0
    },

    /**
     * 輪詢等待新建的訂單「變成看得見」。
     *
     * 建立當下 `customer` 還是空的，讀取權限的 `customer.user_id = $CURRENT_USER`
     * 不成立，所以連本人都讀不到（POST 會回 204、SDK 回 null，拿不到 id）。
     * 等 action flow 補上 `customer` 與 `order_number` 後這筆才會出現，
     * 因此改以「id 大於送出前的最大值」來辨識，而不是靠回傳的 id。
     */
    async waitForNewOrder(afterId, { attempts = 10, intervalMs = 500 } = {}) {
        for (let i = 0; i < attempts; i++) {
            try {
                const [latest] = await directus.request(readItems('orders', {
                    fields: ['id', 'order_number'], sort: ['-id'], limit: 1,
                }))
                if (latest && latest.id > afterId) return latest
            } catch {
                // 尚未補完 customer，這次讀不到是預期內的
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }
        return null
    },

    /** 供完成頁重試單號用（此時訂單已可見） */
    async getOrderNumber(orderId) {
        try {
            const order = await directus.request(
                readItem('orders', orderId, { fields: ['order_number'] })
            )
            return order?.order_number ?? null
        } catch {
            return null
        }
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
