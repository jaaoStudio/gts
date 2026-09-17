// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { configure } from 'vue-gtag'

vi.mock('../utils/directus')
vi.mock('../components/Navbar.vue', () => ({ default: { template: '<nav />' } }))
vi.mock('../components/Footer.vue', () => ({ default: { template: '<footer />' } }))
// 可變的替身：有一條測試要讓 submit() 真的走進「重抓會員資料」那段 await，
// 才碰得到它之後對快照的重驗。固定物件做不到這件事。
const auth = vi.hoisted(() => ({
    isAuthenticated: true,
    customerStatus: 'ready',
    customer: { id: 1, user_name: '王', phone: '0900000000' },
    refreshCustomerProfile: vi.fn(),
}))
vi.mock('../stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('../stores/settings', () => ({
    useSettingsStore: () => ({ shippingRule: null, fetchSettings: async () => {} }),
}))
// ⚠️ 只替換 orderService 本身，其餘 export（DELIVERY / DELIVERY_LABEL…）走真品。
// 手寫整份替身會在 orderService 每次多一個 export 時，以「No X export is defined
// on the mock」炸掉，而那與被測的送單行為無關。真品只相依 ../utils/directus，
// 那支已在上面換成替身。
vi.mock('../services/orderService', async (importOriginal) => ({
    ...(await importOriginal()),
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
    Object.assign(auth, {
        isAuthenticated: true,
        customerStatus: 'ready',
        customer: { id: 1, user_name: '王', phone: '0900000000' },
    })
    vi.stubEnv('VITE_GA_ID', TAG_ID)
    setActivePinia(createPinia())
    configure({ tagId: TAG_ID, initMode: 'manual', resource: { inject: false } })
    window.dataLayer = []
    useConsentStore().set('granted')
    await flushPromises()

    const store = useOrderStore()
    store.items = [
        { variantId: 1, productId: 10, productSlug: 'hammer', productName: '鐵鎚', unitPrice: 100, quantity: 2, canShipCvs: true },
        { variantId: 2, productId: 11, productSlug: 'wrench', productName: '扳手', unitPrice: null, quantity: 3, canShipCvs: true },
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

const submitButton = () => {
    const button = wrapper.findAll('button').find((button) => button.text() === '送出訂購單')
    expect(button).toBeDefined()
    return button
}

const submit = async () => {
    await submitButton().trigger('click')
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
                ? {
                    name: 'OrderDone',
                    params: { id: 101 },
                    // deliveryMethod 一起帶：完成頁的「下一步」文案靠它分岔，
                    // 少了它超商客人會被告知「將通知您匯款方式」——而那永遠不會來
                    state: {
                        orderId: 101,
                        orderNumber: 'GTS-260915-0101',
                        deliveryMethod: 'home_delivery',
                    },
                }
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

describe('交貨方式', () => {
    const cvsRadio = () => wrapper.find('input[type="radio"][value="cvs_cod"]')
    const field = (label) => wrapper.findAll('label').find((l) => l.text().includes(label))
    const setInput = async (labelText, value) => {
        const input = field(labelText).find('input')
        await input.setValue(value)
    }

    test('given_預設_will_是宅配而不是超商', async () => {
        // 超商附帶取貨期限與尺寸限制，要客人主動選，不由我們替他決定
        expect(wrapper.find('input[type="radio"][value="home_delivery"]').element.checked).toBe(true)
        expect(cvsRadio().element.checked).toBe(false)
    })

    test('given_全部品項可超商寄送_will_超商選項可選', async () => {
        expect(cvsRadio().attributes('disabled')).toBeUndefined()
        expect(wrapper.text()).not.toContain('只能走宅配')
    })

    test('given_任一品項不可超商寄送_will_超商停用並說明原因', async () => {
        useOrderStore().items[1].canShipCvs = false
        await flushPromises()

        expect(cvsRadio().attributes('disabled')).toBeDefined()
        // 灰掉但不說原因，客人只會以為壞了
        expect(wrapper.text()).toContain('只能走宅配')
    })

    test('given_含運代收超過上限_will_超商停用並說明原因', async () => {
        useOrderStore().items[0].unitPrice = 4901
        useOrderStore().items[0].quantity = 1
        await flushPromises()

        expect(cvsRadio().attributes('disabled')).toBeDefined()
        expect(wrapper.text()).toContain('代收上限')
    })

    test('given_已選超商後品項變成不可寄_will_自動退回宅配', async () => {
        await cvsRadio().setValue()
        expect(cvsRadio().element.checked).toBe(true)

        useOrderStore().items[1].canShipCvs = false
        await flushPromises()

        // 留著一個選不到卻仍生效的值，送出的會是前台自己判定不可行的組合
        expect(wrapper.find('input[type="radio"][value="home_delivery"]').element.checked).toBe(true)
    })

    test('given_選了超商_will_地址欄換成取貨門市', async () => {
        await cvsRadio().setValue()

        expect(field('取貨門市')).toBeDefined()
        expect(field('送貨地址')).toBeUndefined()
    })

    test('given_超商單填妥_will_送出帶交貨方式與門市', async () => {
        await cvsRadio().setValue()
        await setInput('取貨人手機', '0912345678')
        await setInput('取貨門市', '916712 中山門市')
        await submit()

        expect(orderService.createOrder).toHaveBeenCalledOnce()
        expect(orderService.createOrder.mock.calls[0][0]).toMatchObject({
            deliveryMethod: 'cvs_cod',
            contactPhone: '0912345678',
            cvsStore: '916712 中山門市',
        })
    })

    test('given_超商單填市話_will_按鈕不可送出', async () => {
        // 7-11 到店只發簡訊，市話收不到；收不到就是棄件，而退回的運費老闆自己吃。
        // 宅配那條刻意不驗格式（見 checkOrderInput 的註解），兩條不一致是有理由的。
        await cvsRadio().setValue()
        await setInput('取貨人手機', '0287654321')
        await setInput('取貨門市', '916712 中山門市')

        expect(submitButton().attributes('disabled')).toBeDefined()
    })

    test('given_宅配單填市話_will_照送', async () => {
        await setInput('聯絡電話', '0287654321')
        await submit()

        expect(orderService.createOrder).toHaveBeenCalledOnce()
        expect(orderService.createOrder.mock.calls[0][0]).toMatchObject({
            deliveryMethod: 'home_delivery',
            contactPhone: '0287654321',
        })
    })

    test('given_超商單沒填門市_will_按鈕不可送出', async () => {
        await cvsRadio().setValue()
        await setInput('取貨人手機', '0912345678')

        expect(submitButton().attributes('disabled')).toBeDefined()
    })

    test('given_重抓會員資料期間清掉門市_will_擋在送出前而不是送出空門市', async () => {
        // canSubmit 只在點下去的那一刻成立，但 submit() 內隔著一段 await（重抓會員
        // 資料）。客人在那段期間清掉門市，payload 是 await 之後才取的快照——沒有這道
        // 重驗，送到 Directus 的就是 cvs_store: null，老闆收到一張寄不出去的單。
        auth.customerStatus = 'error'
        auth.customer = null
        let release
        auth.refreshCustomerProfile.mockReturnValue(new Promise((r) => { release = r }))

        await cvsRadio().setValue()
        await setInput('取貨人手機', '0912345678')
        await setInput('取貨門市', '916712 中山門市')
        expect(submitButton().attributes('disabled')).toBeUndefined()

        submitButton().trigger('click')
        await flushPromises()

        await setInput('取貨門市', '')     // 等待期間反悔清空
        auth.customer = { id: 1 }          // 重抓成功，流程繼續往下
        release()
        await flushPromises()

        expect(orderService.createOrder).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('請填寫取貨門市')
    })

    test('given_送出中_will_整區輸入鎖住', async () => {
        // vue-component-conventions「送出流程」的對策是兩件事：快照 + fieldset 鎖住，
        // 少一件都不夠。快照擋的是送出去的值不一致，fieldset 擋的是使用者以為還改得動
        // ——尤其數量按鈕，它是下一條測試那個競態的來源。
        let release
        orderService.getLatestOrderId.mockReturnValue(new Promise((r) => { release = r }))

        expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined()

        submitButton().trigger('click')
        await flushPromises()

        expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()

        release(100)
        await flushPromises()
    })

    test('given_送出期間把品項加到超過代收上限_will_不建單', async () => {
        // 交貨方式在點下按鈕那一刻就定住，品項卻要等 await 之後才讀。數量按鈕全程可按，
        // 所以這個縫隙真的送得出一張「超商、代收超過 5,000」的單。
        const store = useOrderStore()
        store.items = [{ ...store.items[0], unitPrice: 2500, quantity: 1, canShipCvs: true }]
        await flushPromises()

        await cvsRadio().setValue()
        await setInput('取貨人手機', '0912345678')
        await setInput('取貨門市', '916712 中山門市')

        // 讓基準查詢停住，模擬客人在等待期間按「＋」
        let release
        orderService.getLatestOrderId.mockReturnValue(new Promise((r) => { release = r }))
        submitButton().trigger('click')
        await flushPromises()

        store.items[0].quantity = 2      // 小計變 5,000、含運 5,100
        release(100)
        await flushPromises()

        expect(orderService.createOrder).not.toHaveBeenCalled()
        expect(store.submitError).toContain('超商取貨付款')
        expect(store.items).toHaveLength(1)   // 失敗不清空，客人可以改完再送
    })
})
