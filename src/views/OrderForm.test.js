// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { configure } from 'vue-gtag'

vi.mock('../utils/directus')
vi.mock('../components/Navbar.vue', () => ({ default: { template: '<nav />' } }))
vi.mock('../components/Footer.vue', () => ({ default: { template: '<footer />' } }))
vi.mock('../stores/auth', () => ({
    useAuthStore: () => ({
        isAuthenticated: true,
        customerStatus: 'ready',
        customer: { id: 1, user_name: '王', phone: '0900000000' },
    }),
}))
vi.mock('../stores/settings', () => ({
    useSettingsStore: () => ({ shippingRule: null, fetchSettings: async () => {} }),
}))
vi.mock('../services/orderService', () => ({
    orderService: {
        getLatestOrderId: vi.fn(),
        createOrder: vi.fn(),
        waitForNewOrder: vi.fn(),
    },
}))
const navigation = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => navigation }))

import OrderForm from './OrderForm.vue'
import { useOrderStore } from '../stores/order'
import { useConsentStore } from '../stores/consent'
import { orderService } from '../services/orderService'

const TAG_ID = 'G-ORDER-TEST'
const leads = () => window.dataLayer.map((args) => Array.from(args))
    .filter(([command, name]) => command === 'event' && name === 'generate_lead')
let wrapper

beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_GA_ID', TAG_ID)
    setActivePinia(createPinia())
    configure({ tagId: TAG_ID, initMode: 'manual', resource: { inject: false } })
    window.dataLayer = []
    useConsentStore().set('granted')
    await flushPromises()

    const store = useOrderStore()
    store.items = [
        { variantId: 1, productId: 10, productSlug: 'hammer', productName: '鐵鎚', unitPrice: 100, quantity: 2 },
        { variantId: 2, productId: 11, productSlug: 'wrench', productName: '扳手', unitPrice: null, quantity: 3 },
    ]
    vi.spyOn(store, 'revalidate').mockResolvedValue()
    orderService.getLatestOrderId.mockResolvedValue(100)
    orderService.createOrder.mockResolvedValue(null)
    orderService.waitForNewOrder.mockResolvedValue({ id: 101, order_number: 'GTS-260915-0101' })
    wrapper = mount(OrderForm, {
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
})

afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
})

const submit = async () => {
    const button = wrapper.findAll('button').find((button) => button.text() === '送出訂購單')
    expect(button).toBeDefined()
    await button.trigger('click')
    await flushPromises()
}

describe('送單成功事件', () => {
    test.each(['正常取得單號', '輪詢逾時', '基準讀取失敗'])('%s：清空後仍送出正確數量且只送一次', async (outcome) => {
        if (outcome === '輪詢逾時') orderService.waitForNewOrder.mockResolvedValue(null)
        if (outcome === '基準讀取失敗') orderService.getLatestOrderId.mockRejectedValue(new Error('network'))

        await submit()

        expect(orderService.createOrder).toHaveBeenCalledOnce()
        expect(useOrderStore().items).toEqual([])
        expect(leads()).toEqual([['event', 'generate_lead', {
            item_count: 2, total_quantity: 5, quote_item_count: 1,
        }]])
        expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(
            outcome === '正常取得單號'
                ? { name: 'OrderDone', params: { id: 101 }, state: { orderId: 101, orderNumber: 'GTS-260915-0101' } }
                : { name: 'OrderHistory' }
        )
    })

    test('建單失敗時不報轉換，保留品項供重試', async () => {
        orderService.createOrder.mockRejectedValue(new Error('network'))

        await submit()

        expect(leads()).toEqual([])
        expect(useOrderStore().items).toHaveLength(2)
        expect(navigation.replace).not.toHaveBeenCalled()
    })
})
