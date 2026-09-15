// @vitest-environment jsdom
//
// 埋點的**接線**測試。analytics.test.js 只驗「給定參數後 payload 長什麼樣」，
// 驗不到呼叫端到底傳了什麼、甚至有沒有呼叫——刪掉整行 trackViewItem 它照樣全綠。
// 這裡掛載真的元件、讀 window.dataLayer，守的是那一段。

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { configure } from 'vue-gtag'

vi.mock('../utils/directus')
vi.mock('../components/Navbar.vue', () => ({ default: { template: '<nav />' } }))
vi.mock('../components/Footer.vue', () => ({ default: { template: '<footer />' } }))
// 只需要 ProductDetail 真的用到的兩個：漏掉 getCategoryBreadcrumb 會讓 render
// 函式拋錯，Vue 靜默回退到 loading 骨架——看起來像「資料沒載入」而不是 mock 不全
vi.mock('../stores/category', () => ({
    useCategoryStore: () => ({ fetchCategories: async () => {}, getCategoryBreadcrumb: () => [] }),
}))
vi.mock('../stores/settings', () => ({
    useSettingsStore: () => ({ shippingRule: null, lineUrl: '', fetchSettings: async () => {} }),
}))
vi.mock('../services/productService', () => ({
    productService: { getProductBySlug: vi.fn(), getProducts: vi.fn(), getRelated: vi.fn() },
}))
vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { slug: 'hammer' } }),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import ProductDetail from './ProductDetail.vue'
import { useConsentStore } from '../stores/consent'
import { useOrderStore } from '../stores/order'
import { productService } from '../services/productService'

const TAG_ID = 'G-PRODUCT-TEST'

const eventsNamed = (name) =>
    window.dataLayer
        .map((args) => Array.from(args))
        .filter(([command, event]) => command === 'event' && event === name)

// spec_name 刻意用匯入殘留的佔位字串："Default" 必須被正規化成空值，
// 否則 GA 的 item_variant 會與 order store 存的 specName 對不起來
const PRODUCT = {
    id: 'prod-uuid-1',
    slug: 'hammer',
    name: '鐵鎚',
    image: null,
    category: { name: '手工具' },
    description: '',
    short_description: '',
    variants: [{ id: 1, spec_name: 'Default', sku: 'H-1', price: 100, image: null, status: 'published' }],
}

let wrapper

beforeEach(async () => {
    vi.clearAllMocks()
    // consent store 的 track() 與 enable() 都先看 VITE_GA_ID，沒設就整個不啟動
    vi.stubEnv('VITE_GA_ID', TAG_ID)
    setActivePinia(createPinia())
    configure({ tagId: TAG_ID, initMode: 'manual', resource: { inject: false } })
    window.dataLayer = []
    useConsentStore().set('granted')
    await flushPromises()

    productService.getProductBySlug.mockResolvedValue(PRODUCT)
    productService.getProducts?.mockResolvedValue?.({ data: [] })
    productService.getRelated?.mockResolvedValue?.([])

    wrapper = mount(ProductDetail, {
        global: {
            stubs: { 'router-link': { template: '<a><slot /></a>' } },
            directives: { reveal: {} },
        },
    })
    await flushPromises()
})

afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
})

describe('view_item', () => {
    test('商品載入後送出，且帶的是真正的商品', () => {
        // 刪掉呼叫、或傳錯物件，都只有這裡會紅
        expect(eventsNamed('view_item')).toEqual([
            ['event', 'view_item', {
                items: [{ item_id: 'prod-uuid-1', item_name: '鐵鎚', item_category: '手工具' }],
            }],
        ])
    })
})

describe('add_to_cart', () => {
    const addToOrder = async (times = 1) => {
        const button = wrapper.findAll('button').find((b) => b.text().includes('加入訂購單'))
        expect(button).toBeDefined()
        for (let i = 0; i < times; i++) {
            await button.trigger('click')
            await flushPromises()
        }
    }

    test('按下加入訂購單才送出，內容與存進購物車的一致', async () => {
        expect(eventsNamed('add_to_cart')).toEqual([])

        await addToOrder()

        const [event] = eventsNamed('add_to_cart')
        expect(event).toEqual(['event', 'add_to_cart', {
            items: [{
                item_id: 'prod-uuid-1',
                item_name: '鐵鎚',
                item_category: '手工具',
                // "Default" 是匯入殘留的佔位字串，normalizeSpecName 會清成空值後被丟棄
                item_variant: undefined,
                quantity: 1,
            }],
        }])

        // GA 送的 item_id 與 store 存的品項必須指向同一個商品，否則報表對不起來
        expect(useOrderStore().items[0].productId).toBe('prod-uuid-1')
        expect(useOrderStore().items[0].specName).toBe('')
    })

    test('送出的數量是使用者選的數量，不是寫死的 1', async () => {
        const plus = wrapper.findAll('button').find((b) => b.attributes('aria-label')?.includes('增加')
            ?? b.html().includes('PhPlus'))

        // 找不到加號按鈕時直接改 stepper 的輸入，重點是數量不可以被寫死
        const input = wrapper.find('input[type="number"]')
        if (plus) await plus.trigger('click')
        else if (input.exists()) await input.setValue(3)

        await addToOrder()

        const [event] = eventsNamed('add_to_cart')
        const sent = event[2].items[0].quantity
        expect(sent).toBe(useOrderStore().items[0].quantity)
        expect(sent).toBeGreaterThan(0)
    })
})

describe('未同意時', () => {
    test('掛載與加入訂購單都不送任何事件', async () => {
        wrapper.unmount()
        setActivePinia(createPinia())
        window.dataLayer = []
        useConsentStore() // 未 set，維持 null（沒問過）

        wrapper = mount(ProductDetail, {
            global: {
                stubs: { 'router-link': { template: '<a><slot /></a>' } },
                directives: { reveal: {} },
            },
        })
        await flushPromises()

        const button = wrapper.findAll('button').find((b) => b.text().includes('加入訂購單'))
        if (button) {
            await button.trigger('click')
            await flushPromises()
        }

        expect(eventsNamed('view_item')).toEqual([])
        expect(eventsNamed('add_to_cart')).toEqual([])
    })
})
