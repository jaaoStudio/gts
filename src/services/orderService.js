import { createItem, readItems, readItem, updateItem } from '@directus/sdk'
import directus from '../utils/directus'
import { CVS } from '../utils/orderTotals'

/**
 * 交貨方式。**同時決定配送與付款**——組合是鎖死的，所以是一個選擇而不是兩個欄位
 * （why: `docs/adr/0006`）。`pickup` 目前只在 Directus 供老闆選，前台不提供。
 */
export const DELIVERY = {
    homeDelivery: 'home_delivery',
    cvsCod: 'cvs_cod',
    pickup: 'pickup',
}

export const DELIVERY_LABEL = {
    [DELIVERY.homeDelivery]: '宅配（新竹貨運）',
    [DELIVERY.cvsCod]: '7-11 超商取貨付款',
    [DELIVERY.pickup]: '來店自取',
}

// 明細與列表共用。confirmed_* 是老闆確認後的值，客人要看得到才知道實際應付多少。
const ORDER_FIELDS = [
    'id', 'order_number', 'status', 'date_created',
    'contact_name', 'contact_phone', 'contact_address', 'note',
    'subtotal', 'has_quote_items',
    'shipping_fee', 'discount', 'confirmed_total',
    'payment_note', 'paid_at',
    'delivery_method', 'cvs_store', 'tracking_number', 'shipped_at',
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
    async createOrder({ contactName, contactPhone, contactAddress, note, deliveryMethod, cvsStore, items }) {
        return directus.request(createItem('orders', {
            contact_name: contactName || null,
            contact_phone: contactPhone || null,
            // 不適用的那一欄一律送 null，不讓上一次選擇的殘留值留在單上：老闆讀哪一欄
            // 是由 delivery_method 決定的，另一欄有值只會讓他多讀一次才發現讀錯地方。
            contact_address: deliveryMethod === DELIVERY.cvsCod ? null : (contactAddress || null),
            cvs_store: deliveryMethod === DELIVERY.cvsCod ? (cvsStore || null) : null,
            delivery_method: deliveryMethod,
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

    /**
     * 供完成頁重讀單號用（此時訂單已可見）。
     *
     * ⚠️ **讀取失敗一律往上拋**：回傳的 `null` 語意只有一個——訂單讀得到、但
     * `order_number` 還沒被 flow 蓋上。把讀取失敗也吞成 `null`，會讓一次網路或
     * session 抖動被完成頁渲染成「單號稍後產生」這種終局答案，而那筆訂單其實
     * 毫秒前才剛拿到過單號。和 getLatestOrderId() 不吞成 0 是同一個道理。
     *
     * @returns {Promise<string|null>} 單號；null 代表確實尚未蓋上
     */
    async getOrderNumber(orderId) {
        const order = await directus.request(
            readItem('orders', orderId, { fields: ['order_number'] })
        )
        return order?.order_number ?? null
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

/**
 * 超商取貨付款單的文案差異。只覆寫真的不一樣的那兩個狀態：
 *
 * - `quoted` 的鍵名本來就是老闆視角的「已報價」，對超商單它是「已確認、等出貨」——
 *   客人這時什麼都不用做。`ORDER_STATUS` 的「請依下方資訊完成匯款」對他是錯的指示。
 * - `shipped` 要帶取貨期限。超商保留期滿就退回，而退回的運費是老闆自己吃——
 *   這句話是唯一一個能壓低棄件率的零成本槓桿。
 *
 * `paid` 刻意沒有對應文案：超商單走 `pending → quoted → shipped`，錢在取貨時才收、
 * 隔週才入帳，這個狀態永遠不會出現（why: `docs/adr/0006` 第 6 條）。
 */
const CVS_STATUS = {
    quoted: { label: '已確認', hint: '金額已確認，我們會盡快為您寄出，取貨時再付款。' },
    shipped: {
        label: '已出貨',
        hint: `包裹已寄出，到店後會以簡訊通知。請於 ${CVS.holdDays} 天內到指定門市取貨並付款，逾期會退回。`,
    },
}

/**
 * 這張單在這個狀態下該顯示的標籤與說明。
 *
 * ⚠️ 不要退回直接讀 `ORDER_STATUS[status]`：那對超商單會叫客人去匯款。
 */
export const orderStatusCopy = (status, deliveryMethod) =>
    (deliveryMethod === DELIVERY.cvsCod ? CVS_STATUS[status] : null)
    ?? ORDER_STATUS[status]
    ?? null
