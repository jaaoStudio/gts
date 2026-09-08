import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// utils/directus 會在載入時用 import.meta.env 建 SDK client，node 環境下沒有那些
// 變數會直接爆掉。這裡只需要 getAssetUrl 的行為，整個模組換掉最省事。
vi.mock('../utils/directus', () => ({
    default: {},
    getAssetUrl: (id) => (id ? `https://assets.test/${id}` : null),
}))

vi.mock('../services/orderService', () => ({
    orderService: {
        getLatestOrderId: vi.fn(),
        createOrder: vi.fn(),
        waitForNewOrder: vi.fn(),
    },
}))

vi.mock('../services/productService', () => ({
    productService: { getVariantsByIds: vi.fn() },
}))

const { useOrderStore } = await import('./order')
const { orderService } = await import('../services/orderService')
const { productService } = await import('../services/productService')

const line = (over = {}) => ({
    variantId: 1,
    productId: 10,
    productSlug: 'hammer',
    productName: '鐵鎚',
    specName: '',
    sku: 'H-1',
    unitPrice: 100,
    quantity: 1,
    image: null,
    ...over,
})

// revalidate() 拿到的是 Directus 形狀：product_id 是展開後的物件
const variant = (over = {}) => ({
    id: 1,
    price: 100,
    spec_name: '',
    sku: 'H-1',
    stock: 5,
    variant_image: null,
    product_id: { name: '鐵鎚', slug: 'hammer', image: null },
    ...over,
})

// add() 收的是 mapProduct 的結果與它底下的 variant，欄位命名與 store 內部不同
const product = (over = {}) => ({ id: 10, slug: 'hammer', name: '鐵鎚', image: null, ...over })
const addableVariant = (over = {}) => ({ id: 1, spec_name: '', sku: 'H-1', price: 100, image: null, ...over })

/**
 * 模擬重新整理：換一個 pinia，讓 store 從 localStorage 重新還原。
 *
 * 直接指派 `s.items` 只動到記憶體。若 clear() 哪天漏掉 _persist()，斷言記憶體
 * 是空的仍然會通過，但客人重整後會從 gts_order_items 還原出已經送出的品項，
 * 然後再送一次——「不重送」這個保證是存在儲存層的，測試就要驗到儲存層。
 */
const itemsAfterReload = () => {
    setActivePinia(createPinia())
    const fresh = useOrderStore()
    fresh.init()
    return fresh.items
}

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
})

describe('金額 getter', () => {
    test('given_混合詢價與標價品項_will_只加總標價的部分', () => {
        const s = useOrderStore()
        s.items = [
            line({ variantId: 1, unitPrice: 100, quantity: 2 }),
            line({ variantId: 2, unitPrice: null, quantity: 5 }),
        ]

        expect(s.subtotal).toBe(200)
        expect(s.hasQuoteItems).toBe(true)
        expect(s.quoteItemCount).toBe(1)
        // 件數要算進詢價品項——那是「這張單有幾件東西」，跟能不能算錢無關
        expect(s.count).toBe(7)
    })

    test('given_全部都是詢價品項_will_小計為0但不可當成免費', () => {
        const s = useOrderStore()
        s.items = [line({ unitPrice: null, quantity: 3 })]

        expect(s.subtotal).toBe(0)
        expect(s.hasQuoteItems).toBe(true)
        expect(s.isEmpty).toBe(false)
    })

    test('given_單價為0的品項_will_計入且不算成詢價', () => {
        const s = useOrderStore()
        s.items = [line({ unitPrice: 0, quantity: 4 })]

        expect(s.subtotal).toBe(0)
        expect(s.hasQuoteItems).toBe(false)
    })
})

describe('submit — 辨識新訂單的基準（C1）', () => {
    const payload = { contactName: '王', contactPhone: '0900000000', contactAddress: '', note: '' }

    test('given_基準讀取失敗_will_略過輪詢而不是拿舊單充數', async () => {
        const s = useOrderStore()
        s.add(product(), addableVariant(), 1)

        orderService.getLatestOrderId.mockRejectedValue(new Error('network flake'))
        orderService.createOrder.mockResolvedValue({ id: null })

        const result = await s.submit(payload)

        // 這是 C1 的核心：讀取失敗曾被吞成 0，導致任何舊單都滿足 id > 0，
        // 輪詢第一圈就命中舊單，客人拿到別張單的單號去填匯款備註
        expect(orderService.waitForNewOrder).not.toHaveBeenCalled()
        expect(result).toEqual({ id: null, orderNumber: null })
        // 訂單確實已建立，購物車要清空——連重整之後都不能復活，否則客人會重送
        expect(s.items).toEqual([])
        expect(itemsAfterReload()).toEqual([])
    })

    test('given_新客人本來就沒有訂單_will_仍然正常輪詢', async () => {
        const s = useOrderStore()
        s.items = [line()]

        // 基準 0 是合法值（真的沒有任何訂單），不可與讀取失敗混為一談
        orderService.getLatestOrderId.mockResolvedValue(0)
        orderService.createOrder.mockResolvedValue({ id: null })
        orderService.waitForNewOrder.mockResolvedValue({ id: 1, order_number: 'GTS-260908-0001' })

        const result = await s.submit(payload)

        expect(orderService.waitForNewOrder).toHaveBeenCalledWith(0)
        expect(result).toEqual({ id: 1, orderNumber: 'GTS-260908-0001' })
    })

    test('given_輪詢逾時_will_仍清空購物車且重整後不會復活', async () => {
        const s = useOrderStore()
        s.add(product(), addableVariant(), 1)
        // 前置條件：購物車真的寫進儲存層了，否則後面的斷言會平白通過
        expect(itemsAfterReload()).toHaveLength(1)
        setActivePinia(createPinia())

        const s2 = useOrderStore()
        s2.init()

        orderService.getLatestOrderId.mockResolvedValue(101)
        orderService.createOrder.mockResolvedValue({ id: null })
        orderService.waitForNewOrder.mockResolvedValue(null)

        const result = await s2.submit(payload)

        expect(result).toEqual({ id: null, orderNumber: null })
        expect(s2.items).toEqual([])
        expect(itemsAfterReload()).toEqual([])
    })

    test('given_建單失敗_will_保留購物車且重整後仍在', async () => {
        const s = useOrderStore()
        s.add(product(), addableVariant(), 1)

        orderService.getLatestOrderId.mockResolvedValue(101)
        orderService.createOrder.mockRejectedValue(new Error('500'))

        const result = await s.submit(payload)

        expect(result).toBeNull()
        expect(s.items).toHaveLength(1)
        expect(s.submitError).toBeTruthy()
        expect(s.submitting).toBe(false)
        // 失敗要能直接重試——重整後品項必須還在
        expect(itemsAfterReload()).toHaveLength(1)
    })

    test('given_訂購單是空的_will_不送出', async () => {
        const s = useOrderStore()
        s.items = []

        expect(await s.submit(payload)).toBeNull()
        expect(orderService.createOrder).not.toHaveBeenCalled()
    })

    test('given_已經在送出中_will_不重複送出', async () => {
        const s = useOrderStore()
        s.items = [line()]
        s.submitting = true

        expect(await s.submit(payload)).toBeNull()
        expect(orderService.createOrder).not.toHaveBeenCalled()
    })
})

describe('revalidate — 三條路', () => {
    test('given_商品已不存在_will_移除該行並提示', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1 }), line({ variantId: 2, productName: '扳手' })]

        productService.getVariantsByIds.mockResolvedValue([variant({ id: 1 })])

        await s.revalidate()

        expect(s.items).toHaveLength(1)
        expect(s.items[0].variantId).toBe(1)
        expect(s.notices).toHaveLength(1)
        expect(s.notices[0].type).toBe('removed')
        expect(s.notices[0].text).toContain('扳手')
    })

    test('given_價格已變動_will_更新快照並提示', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1, unitPrice: 100 })]

        productService.getVariantsByIds.mockResolvedValue([variant({ id: 1, price: 150 })])

        await s.revalidate()

        expect(s.items[0].unitPrice).toBe(150)
        expect(s.notices[0].type).toBe('price')
        expect(s.notices[0].text).toContain('150')
    })

    test('given_價格從標價變成詢價_will_提示為詢價而不是NT$null', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1, unitPrice: 100 })]

        productService.getVariantsByIds.mockResolvedValue([variant({ id: 1, price: null })])

        await s.revalidate()

        expect(s.items[0].unitPrice).toBeNull()
        expect(s.notices[0].text).toContain('詢價')
    })

    test('given_價格沒變_will_不產生提示', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1, unitPrice: 100 })]

        productService.getVariantsByIds.mockResolvedValue([variant({ id: 1, price: 100 })])

        await s.revalidate()

        expect(s.notices).toHaveLength(0)
    })

    test('given_整批查詢失敗_will_保留舊品項並改顯示error', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1, unitPrice: 100 })]

        productService.getVariantsByIds.mockRejectedValue(new Error('500'))

        await s.revalidate()

        // 寧可讓客人看到舊價，也不要把整張訂購單清空
        expect(s.items).toHaveLength(1)
        expect(s.items[0].unitPrice).toBe(100)
        expect(s.error).toBeTruthy()
        expect(s.loading).toBe(false)
    })

    test('given_規格名是匯入殘留的Default_will_正規化成空字串', async () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1, specName: 'Default' })]

        productService.getVariantsByIds.mockResolvedValue([variant({ id: 1, spec_name: 'Default' })])

        await s.revalidate()

        expect(s.items[0].specName).toBe('')
    })

    test('given_訂購單是空的_will_不打API', async () => {
        const s = useOrderStore()
        s.items = []

        await s.revalidate()

        expect(productService.getVariantsByIds).not.toHaveBeenCalled()
    })
})

describe('品項增刪', () => {
    test('given_同一規格重複加入_will_累加數量而不是新增一行', () => {
        const s = useOrderStore()
        const product = { id: 10, slug: 'hammer', name: '鐵鎚', image: null }
        const v = { id: 1, spec_name: 'Default', sku: 'H-1', price: 100, image: null }

        s.add(product, v, 2)
        s.add(product, v, 3)

        expect(s.items).toHaveLength(1)
        expect(s.items[0].quantity).toBe(5)
        // Default 是匯入殘留的佔位字串，不是真的規格名
        expect(s.items[0].specName).toBe('')
    })

    test('given_數量是0或負數_will_至少加入1件', () => {
        const s = useOrderStore()
        s.add({ id: 10, slug: 'x', name: 'X' }, { id: 1, price: 100 }, 0)

        expect(s.items[0].quantity).toBe(1)
    })

    test('given_數量調成0_will_直接移除該行', () => {
        const s = useOrderStore()
        s.items = [line({ variantId: 1 })]

        s.updateQuantity(1, 0)

        expect(s.items).toEqual([])
    })
})
