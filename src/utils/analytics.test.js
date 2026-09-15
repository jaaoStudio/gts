// @vitest-environment jsdom
//
// 啟動接線由 main.test.js 驗證；這裡驗事件 payload 與頁面欄位。

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { configure } from 'vue-gtag'
import { useConsentStore } from '../stores/consent'
import {
    routeToPageView,
    trackAddToCart,
    trackGenerateLead,
    trackViewItem,
} from './analytics'

const TAG_ID = 'G-TESTID'

configure({ tagId: TAG_ID, resource: { inject: false } })

// 只看 event：configure() 自己會推 js + config 兩筆，那是設定不是追蹤資料
const eventsNamed = (name) =>
    window.dataLayer
        .map((args) => Array.from(args))
        .filter((a) => a[0] === 'event' && a[1] === name)
const firstItem = (name) => eventsNamed(name)[0][2].items[0]

const product = { id: 'prod-1', name: '專利水泥攪拌器轉接頭組', category: { name: '接桿/轉接頭' } }

beforeEach(async () => {
    vi.stubEnv('VITE_GA_ID', TAG_ID)
    setActivePinia(createPinia())
    window.dataLayer = []
    delete window[`ga-disable-${TAG_ID}`]

    const store = useConsentStore()
    store.set('granted')
    await new Promise((r) => setTimeout(r, 0))
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('事件 payload', () => {
    test('view_item 與 add_to_cart 必須用同一個 item_id', () => {
        trackViewItem(product)
        trackAddToCart(product, 2, '1母2子')

        expect(firstItem('add_to_cart').item_id).toBe(firstItem('view_item').item_id)
    })

    test('規格放在 item_variant，不混進 item_id', () => {
        trackAddToCart(product, 2, '1母2子')

        const item = firstItem('add_to_cart')
        expect(item.item_variant).toBe('1母2子')
        expect(item.quantity).toBe(2)
        expect(item.item_id).not.toContain('1母2子')
    })

    test('商品事件不帶任何金額欄位', () => {
        trackViewItem(product)
        trackAddToCart(product, 1, '1母2子')

        for (const name of ['view_item', 'add_to_cart']) {
            expect(firstItem(name)).not.toHaveProperty('price')
            expect(eventsNamed(name)[0][2]).not.toHaveProperty('value')
            expect(eventsNamed(name)[0][2]).not.toHaveProperty('currency')
        }
    })

    test('generate_lead 帶品項數但不帶金額', () => {
        trackGenerateLead({ itemCount: 3, totalQuantity: 7, quoteItemCount: 2 })

        const payload = eventsNamed('generate_lead')[0][2]
        expect(payload).toMatchObject({ item_count: 3, total_quantity: 7, quote_item_count: 2 })
        expect(payload).not.toHaveProperty('value')
        expect(payload).not.toHaveProperty('currency')
        expect(payload).not.toHaveProperty('items')
    })
})

describe('routeToPageView', () => {
    test('標題取自 meta，路徑用實際路徑', () => {
        const view = routeToPageView({
            path: '/product/abc',
            meta: { title: '某商品｜金同心實業' },
        })

        expect(view.page_title).toBe('某商品｜金同心實業')
        // 換成 route.matched 的 pattern 會讓所有商品併成一列
        expect(view.page_path).toBe('/product/abc')
    })
})
