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

// 多規格商品的圖與規格是兩個可以各自切換的狀態。這一組守的是「客人看到的圖」與
// 「他實際會買到的規格」不會分岔——真的發生過：折合鋸那一頁開場就預選了 id 最小的
// 「鋸片2片裝」，客人點了鋸子的照片後按加入訂購單，拿到的是兩片替刃。
describe('多規格商品', () => {
    // ⚠️ 要與 productService 的 mapImage() 同形。少一個鍵不會讓這裡報錯，而是讓
    // 以該鍵比對身分的程式把所有圖看成同一張——漏了 id 時就是這樣紅的。
    const img = (id) => ({
        id,
        thumb: `https://assets.test/${id}?key=thumb`,
        card: `https://assets.test/${id}?key=card`,
        detail: `https://assets.test/${id}?key=detail`,
        full: `https://assets.test/${id}?key=full`,
    })

    const MULTI = {
        ...PRODUCT,
        mainImage: img('main-img'),
        gallery: [img('shared-1')],
        variants: [
            // 刻意讓 id 小的是「配件」：預選第一個就會選到它
            { id: 10, spec_name: '鋸片2片裝', sku: 'B-2', price: 198, images: img('img-blade'), image: null, status: 'published' },
            { id: 11, spec_name: '整支鋸子', sku: 'S-1', price: 290, images: img('img-saw'), image: null, status: 'published' },
        ],
    }

    const bigImageSrc = () => wrapper.find('button[aria-label="放大檢視 鐵鎚"] img').attributes('src')
    const variantButton = (text) =>
        wrapper.findAll('button').find((b) => b.text().includes(text))
    const addButton = () =>
        wrapper.findAll('button').find((b) => b.text().includes('加入訂購單') || b.text().includes('請先選擇規格'))

    beforeEach(async () => {
        wrapper.unmount()
        productService.getProductBySlug.mockResolvedValue(MULTI)
        wrapper = mount(ProductDetail, {
            global: {
                stubs: { 'router-link': { template: '<a><slot /></a>' } },
                directives: { reveal: {} },
            },
        })
        await flushPromises()
    })

    test('開頁不預選規格，加入訂購單按鈕停用', () => {
        const btn = addButton()
        expect(btn.text()).toContain('請先選擇規格')
        expect(btn.attributes('disabled')).toBeDefined()
        // 沒選規格時價格顯示區間，而不是某一個規格的價格
        expect(wrapper.text()).toContain('NT$198 - NT$290')
    })

    test('選了規格之後，大圖換成該規格的圖', async () => {
        expect(bigImageSrc()).toContain('main-img')

        await variantButton('整支鋸子').trigger('click')

        expect(bigImageSrc()).toContain('img-saw')
        expect(addButton().attributes('disabled')).toBeUndefined()
    })

    // 規格鈕顯示 raw spec_name，標示走 normalizeSpecName。兩邊不一致時，客人按下寫著
    // 「Default」的按鈕後標示會整個消失——而那行字正是為了讓他知道自己買的是哪一個。
    // 今天 374 個 Default 都在單規格商品上（標示本來就不顯示），所以這是潛伏的。
    test('規格名是匯入殘留的 Default 時，標示退回原字串而不是消失', async () => {
        wrapper.unmount()
        productService.getProductBySlug.mockResolvedValue({
            ...MULTI,
            variants: [
                { id: 20, spec_name: 'Default', sku: 'D-1', price: 50, images: img('a'), image: null, status: 'published' },
                { id: 21, spec_name: '加長型', sku: 'D-2', price: 80, images: img('b'), image: null, status: 'published' },
            ],
        })
        wrapper = mount(ProductDetail, {
            global: {
                stubs: { 'router-link': { template: '<a><slot /></a>' } },
                directives: { reveal: {} },
            },
        })
        await flushPromises()

        await variantButton('Default').trigger('click')
        expect(wrapper.text()).toContain('目前規格：Default')
    })

    // 配件（is_accessory）在這一頁是「分區顯示」而非「另一種行為」：同一組單選、
    // 選一個加一次。真正有行為差異的只有兩處——分在哪一區、以及不算進起價。
    describe('配件', () => {
        const WITH_ACC = {
            ...MULTI,
            variants: [
                { id: 30, spec_name: '專用螺絲組', sku: 'A-1', price: 70, images: img('a'), image: null, status: 'published', is_accessory: true },
                { id: 31, spec_name: '270mm', sku: 'S-1', price: 300, images: img('b'), image: null, status: 'published', is_accessory: false },
                { id: 32, spec_name: '210mm', sku: 'S-2', price: 280, images: img('c'), image: null, status: 'published', is_accessory: false },
            ],
        }

        beforeEach(async () => {
            wrapper.unmount()
            productService.getProductBySlug.mockResolvedValue(WITH_ACC)
            wrapper = mount(ProductDetail, {
                global: {
                    stubs: { 'router-link': { template: '<a><slot /></a>' } },
                    directives: { reveal: {} },
                },
            })
            await flushPromises()
        })

        test('分成「選擇規格」與「專屬配件」兩區', () => {
            const labels = wrapper.findAll('p').map((p) => p.text())
                .filter((t) => t === '選擇規格' || t === '專屬配件')
            expect(labels).toEqual(['選擇規格', '專屬配件'])
        })

        test('價格區間不含配件——否則下緣會是螺絲組的 70 元', () => {
            expect(wrapper.text()).toContain('NT$280 - NT$300')
            expect(wrapper.text()).not.toContain('NT$70 - ')
        })

        test('選到配件時標示寫「目前配件」，不是「目前規格」', async () => {
            await variantButton('專用螺絲組').trigger('click')
            expect(wrapper.text()).toContain('目前配件：專用螺絲組')

            await variantButton('270mm').trigger('click')
            expect(wrapper.text()).toContain('目前規格：270mm')
        })

        test('配件加得進訂購單，行為與規格相同', async () => {
            await variantButton('專用螺絲組').trigger('click')
            await addButton().trigger('click')
            await flushPromises()
            expect(useOrderStore().items[0].specName).toBe('專用螺絲組')
        })
    })

    test('點共用圖只換大圖，不會把已選的規格改掉', async () => {
        await variantButton('整支鋸子').trigger('click')

        const sharedThumb = wrapper.findAll('button')
            .find((b) => b.find('img').exists() && b.find('img').attributes('src')?.includes('shared-1'))
        expect(sharedThumb).toBeDefined()
        await sharedThumb.trigger('click')

        expect(bigImageSrc()).toContain('shared-1')
        // 圖換了，但賣的還是鋸子：按鈕仍可按，且標示持續說明目前規格是哪一個
        expect(addButton().attributes('disabled')).toBeUndefined()
        expect(wrapper.text()).toContain('目前規格：整支鋸子')

        await addButton().trigger('click')
        await flushPromises()
        expect(useOrderStore().items[0].specName).toBe('整支鋸子')
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
