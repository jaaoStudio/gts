import { beforeEach, describe, expect, test, vi } from 'vitest'

// createItem 原樣回傳呼叫參數，request 直接放行——這樣斷言的就是「真正送去 Directus
// 的那包 payload」，而不是某個中間層的整理結果。
vi.mock('@directus/sdk', () => ({
    createItem: (collection, payload, options) => ({ collection, payload, options }),
    readItem: vi.fn(),
    readItems: vi.fn(),
    updateItem: vi.fn(),
}))
vi.mock('../utils/directus', () => ({
    default: { request: vi.fn((built) => built) },
}))

const { orderService, orderStatusCopy, ORDER_STATUS, DELIVERY } =
    await import('./orderService')

const create = async (over = {}) => {
    const { payload } = await orderService.createOrder({
        contactName: '王',
        contactPhone: '0912345678',
        contactAddress: '台北市中正區…',
        cvsStore: '916712 中山門市',
        note: '',
        deliveryMethod: DELIVERY.homeDelivery,
        items: [{ variantId: 1, productName: '鐵鎚', quantity: 1, unitPrice: 100 }],
        ...over,
    })
    return payload
}

beforeEach(() => vi.clearAllMocks())

describe('createOrder：不適用的欄位一律送 null', () => {
    // 老闆讀哪一欄是由 delivery_method 決定的。另一欄留著上一次選擇的殘值，
    // 他會讀到一個看起來合法、實際上作廢的地址或門市。

    test('given_宅配單_will_帶地址且門市為null', async () => {
        const payload = await create({ deliveryMethod: DELIVERY.homeDelivery })

        expect(payload.delivery_method).toBe('home_delivery')
        expect(payload.contact_address).toBe('台北市中正區…')
        expect(payload.cvs_store).toBeNull()
    })

    test('given_超商單_will_帶門市且地址為null', async () => {
        const payload = await create({ deliveryMethod: DELIVERY.cvsCod })

        expect(payload.delivery_method).toBe('cvs_cod')
        expect(payload.cvs_store).toBe('916712 中山門市')
        expect(payload.contact_address).toBeNull()
    })

    test('given_超商單但門市是空字串_will_送null而不是空字串', async () => {
        // 空字串在 Directus 裡是「填過但清空了」，與「不適用」是兩件事
        const payload = await create({ deliveryMethod: DELIVERY.cvsCod, cvsStore: '' })

        expect(payload.cvs_store).toBeNull()
    })

    test('given_任何交貨方式_will_都不送customer欄位', async () => {
        // 送了會 403；customer 由 action flow 依登入帳號反查後補上，
        // 客戶端因此無從把訂單掛到別人名下
        const payload = await create({ deliveryMethod: DELIVERY.cvsCod })

        expect(payload).not.toHaveProperty('customer')
    })
})

describe('orderStatusCopy', () => {
    test('given_超商單的quoted_will_不是叫客人去匯款', () => {
        // 對超商單顯示「請依下方資訊完成匯款」是錯的指示——他什麼都不用做
        const copy = orderStatusCopy('quoted', DELIVERY.cvsCod)

        expect(copy.label).toBe('已確認')
        expect(copy.hint).not.toContain('匯款')
        expect(copy.hint).toContain('取貨時')
    })

    test('given_宅配單的quoted_will_維持匯款指示', () => {
        expect(orderStatusCopy('quoted', DELIVERY.homeDelivery)).toEqual(ORDER_STATUS.quoted)
    })

    test('given_超商單的shipped_will_帶取貨期限', () => {
        // 逾期退回的運費是老闆自己吃，這句話是唯一能壓低棄件率的零成本槓桿
        expect(orderStatusCopy('shipped', DELIVERY.cvsCod).hint).toContain('7 天')
    })

    test('given_超商單沒有覆寫的狀態_will_退回共用文案', () => {
        expect(orderStatusCopy('pending', DELIVERY.cvsCod)).toEqual(ORDER_STATUS.pending)
        expect(orderStatusCopy('cancelled', DELIVERY.cvsCod)).toEqual(ORDER_STATUS.cancelled)
    })

    test('given_舊單沒有交貨方式_will_退回共用文案而不是炸掉', () => {
        // delivery_method 是新欄位，在它之前建立的單讀回來是 null
        expect(orderStatusCopy('quoted', null)).toEqual(ORDER_STATUS.quoted)
        expect(orderStatusCopy('quoted', undefined)).toEqual(ORDER_STATUS.quoted)
    })

    test('given_未知狀態_will_回null讓呼叫端退回顯示原始值', () => {
        expect(orderStatusCopy('something_new', DELIVERY.cvsCod)).toBeNull()
    })
})
