// @vitest-environment jsdom
//
// 唯一需要 DOM 的測試檔。其餘測試維持 node 環境（見 vite.config.js）——
// 這裡用 docblock 單獨切換，而不是把整個專案的環境換成 jsdom。
//
// 存在的理由（#13）：orderTotals 的測試守得住「confirmedSubtotal 是 lineTotal
// 的加總」，但守不住「明細頁真的用了 lineTotal」。把 itemTotal() 改回自己乘一次，
// 逐行金額就與小計脫鉤，而純函式的測試全綠——那正是 GTS-260907-0039 的形狀。
// 這個檔案驗的是渲染出來的數字，是唯一能接住那條的層級。

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'

// 替身在 src/utils/__mocks__/directus.js（多個測試檔共用，理由見那支檔案）
vi.mock('../utils/directus')

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { id: '1' } }),
}))

// 版面元件與圖示對金額無關，換成空殼避免它們自己的相依（auth store、directus）被拉進來
vi.mock('../components/Navbar.vue', () => ({ default: { template: '<nav />' } }))
vi.mock('../components/Footer.vue', () => ({ default: { template: '<footer />' } }))
vi.mock('../components/OrderStatusChip.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@phosphor-icons/vue', () => ({ PhCaretLeft: { template: '<i />' } }))

vi.mock('../services/orderService', () => ({
    orderService: { getOrder: vi.fn(), reportPayment: vi.fn() },
    ORDER_STATUS: {
        paid: { label: '已付款', hint: '款項已確認，正在為您準備出貨。' },
    },
}))

const OrderDetail = (await import('./OrderDetail.vue')).default
const { orderService } = await import('../services/orderService')

const item = (over = {}) => ({
    id: 1,
    product_name: '鐵鎚',
    spec_name: '',
    quantity: 1,
    unit_price: 100,
    confirmed_price: null,
    ...over,
})

/** 明細頁的形狀。status 用 paid 以避開只有 quoted 才會拉的匯款資訊 */
const order = (items) => ({
    id: 1,
    order_number: 'GTS-260907-0039',
    status: 'paid',
    date_created: '2026-09-07T10:00:00Z',
    subtotal: 1530,
    confirmed_total: 1650,   // 非 null 才會渲染「確認後小計」那一欄
    shipping_fee: null,
    items,
})

/** 從 "NT$1,650" 取出 1650；「待報價」回傳 null（那一行沒有金額可加） */
const parseAmount = (text) => {
    const t = text.trim()
    if (!t.startsWith('NT$')) return null
    return Number(t.replace(/[^0-9-]/g, ''))
}

const renderOrder = async (items) => {
    orderService.getOrder.mockResolvedValue(order(items))
    const wrapper = mount(OrderDetail, {
        global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    return wrapper
}

/**
 * 抓手用 data-testid，不用 Tailwind class。
 *
 * 先前是 `findAll('li .text-right > p.font-bold')`——組成它的全是純表現層的東西
 * （排版容器、字重）。這支測試驗的是「逐行加起來等於小計」，卻會因為有人改個
 * 字重或把 flex 換成 grid 而失敗，而且失敗訊息指向錯的地方（selector 抓不到
 * 就直接 undefined 爆掉）。那種紅燈遲早會讓人把測試刪掉。
 * vite.config.js 也寫了同一件事：不讓測試跟 class 名稱之類的版面細節耦合。
 */
const lineAmountNodes = (wrapper) => wrapper.findAll('[data-testid="line-amount"]')

/** 逐行金額，已解析成數字；「待報價」為 null */
const lineAmounts = (wrapper) => lineAmountNodes(wrapper).map((p) => parseAmount(p.text()))

/** 「確認後小計」那一列的數字 */
const subtotalShown = (wrapper) =>
    parseAmount(wrapper.get('[data-testid="confirmed-subtotal"]').text())

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
})

describe('明細頁：逐行金額與小計的一致性', () => {
    test('given_老闆改過價_will_逐行顯示的是確認價而不是下單價', async () => {
        // GTS-260907-0039：下單 510、確認 550、數量 3
        const w = await renderOrder([item({ unit_price: 510, confirmed_price: 550, quantity: 3 })])

        // 退回 unit_price 的話這裡會是 1530
        expect(lineAmounts(w)).toEqual([1650])
    })

    test('given_任何組合_will_畫面上逐行加起來等於畫面上的小計', async () => {
        // 這是客人真的會做的事：把每一行加起來，跟小計對一次
        const w = await renderOrder([
            item({ id: 1, unit_price: 510, confirmed_price: 550, quantity: 3 }),
            item({ id: 2, unit_price: 100, confirmed_price: null, quantity: 2 }),
            item({ id: 3, unit_price: null, confirmed_price: null, quantity: 5 }), // 詢價未報價
            item({ id: 4, unit_price: 200, confirmed_price: 0, quantity: 1 }),     // 老闆送的
        ])

        const byLine = lineAmounts(w).reduce((sum, n) => sum + (n ?? 0), 0)

        expect(byLine).toBe(subtotalShown(w))
        expect(byLine).toBe(1850)
    })

    test('given_詢價品項尚未報價_will_該行顯示待報價而不是NT$0', async () => {
        // 顯示 NT$0 會讓客人以為這項免費
        const w = await renderOrder([item({ unit_price: null, confirmed_price: null, quantity: 5 })])

        expect(lineAmountNodes(w)[0].text()).toBe('待報價')
        expect(subtotalShown(w)).toBe(0)
    })
})
