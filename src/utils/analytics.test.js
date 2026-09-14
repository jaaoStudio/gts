// @vitest-environment jsdom
//
// 需要 DOM 的第二個測試檔（另一個是 OrderDetail.test.js）：clearGaCookies() 讀寫
// document.cookie 與 location.hostname。
//
// 存在的理由：這塊的失效全是靜默的——撤回同意變成空操作、事件照送但 item_id 對不上、
// 啟動被呼叫兩次而每次換頁送出兩筆。這三種都不會拋錯，只會讓報表安靜地變成錯的。

import { beforeEach, describe, expect, test, vi } from 'vitest'

const TAG_ID = 'G-TESTID'
const CONSENT_KEY = 'gts_analytics_consent'

/**
 * 取全新的模組實例。`consent` ref 與 `started` 旗標都是模組層狀態，共用會讓
 * 測試互相汙染——尤其 `started` 一旦為 true 就再也測不到「第一次啟動」。
 *
 * `resource.inject: false`：不去下載 gtag.js（測試不碰網路），但 dataLayer 照樣
 * 會被填，所以斷言拿到的是真實 payload 而不是 mock 的呼叫紀錄。
 */
const load = async () => {
    vi.resetModules()
    window.dataLayer = []
    const gtag = await import('vue-gtag')
    gtag.configure({ tagId: TAG_ID, resource: { inject: false } })
    return await import('./analytics')
}

const calls = () => window.dataLayer.map((args) => Array.from(args))
/**
 * 只看 `event`。`configure()` 本身就會推 `js` + `config` 兩筆，那是設定不是追蹤資料
 * ——script 沒載入就沒人消化它（實測過網路層零請求），所以守衛要保證的是「沒有
 * event 送出去」，不是「dataLayer 全空」。
 */
const trackingEvents = () => calls().filter((a) => a[0] === 'event')
const eventsNamed = (name) => trackingEvents().filter((a) => a[1] === name)
const firstItem = (name) => eventsNamed(name)[0][2].items[0]

const product = { id: 'prod-1', name: '專利水泥攪拌器轉接頭組', category: { name: '接桿/轉接頭' } }
const variant = { id: 'var-1', sku: 'SKU-1' }

beforeEach(() => {
    delete window[`ga-disable-${TAG_ID}`]
    document.cookie.split(';').forEach((entry) => {
        const name = entry.split('=')[0].trim()
        if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    })
})

describe('consent 三態', () => {
    test('沒問過時是 null', async () => {
        const a = await load()
        expect(a.consent.value).toBe(null)
    })

    test('setConsent 與 reopenConsent 會同步 ref 與 localStorage', async () => {
        const a = await load()

        a.setConsent('denied')
        expect(a.consent.value).toBe('denied')
        expect(localStorage.getItem(CONSENT_KEY)).toBe('denied')

        a.reopenConsent()
        expect(a.consent.value).toBe(null)
        expect(localStorage.getItem(CONSENT_KEY)).toBe(null)
    })

    test('已拒絕過的人重新載入時不會被再問一次', async () => {
        localStorage.setItem(CONSENT_KEY, 'denied')
        const a = await load()
        // banner 的顯示條件是 consent === null；'denied' 必須與「沒問過」區分得開
        expect(a.consent.value).toBe('denied')
    })

    test('localStorage 寫不進去時，記憶體狀態仍然正確', async () => {
        const a = await load()
        vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
            throw new Error('QuotaExceededError')
        })

        a.setConsent('granted')

        // 同意不重載頁面，所以這個記憶體狀態撐得過這次瀏覽（無痕模式的路徑）
        expect(a.consent.value).toBe('granted')
    })
})

describe('未同意時不得送出任何東西', () => {
    test('三個事件都不推 dataLayer', async () => {
        const a = await load()

        a.trackViewItem(product)
        a.trackAddToCart(product, variant, 1, '1母2子')
        a.trackGenerateLead({ itemCount: 1, totalQuantity: 1, quoteItemCount: 0 })

        expect(trackingEvents()).toHaveLength(0)
    })

    test('拒絕之後也一樣', async () => {
        const a = await load()
        a.setConsent('denied')

        a.trackViewItem(product)

        expect(trackingEvents()).toHaveLength(0)
    })
})

describe('事件 payload', () => {
    test('view_item 與 add_to_cart 必須用同一個 item_id', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackViewItem(product)
        a.trackAddToCart(product, variant, 2, '1母2子')

        // 兩把 key 不同的話，GA4 會把同一商品的瀏覽與加入拆成兩列，漏斗永遠對不起來
        expect(firstItem('add_to_cart').item_id).toBe(firstItem('view_item').item_id)
    })

    test('規格放在 item_variant，不混進 item_id', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackAddToCart(product, variant, 2, '1母2子')

        const item = firstItem('add_to_cart')
        expect(item.item_variant).toBe('1母2子')
        expect(item.quantity).toBe(2)
        expect(item.item_id).not.toContain('1母2子')
    })

    test('商品事件不帶任何金額欄位', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackViewItem(product)
        a.trackAddToCart(product, variant, 1, '1母2子')

        for (const name of ['view_item', 'add_to_cart']) {
            const item = firstItem(name)
            expect(item).not.toHaveProperty('price')
            expect(eventsNamed(name)[0][2]).not.toHaveProperty('value')
            expect(eventsNamed(name)[0][2]).not.toHaveProperty('currency')
        }
    })

    test('generate_lead 帶品項數但不帶金額', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackGenerateLead({ itemCount: 3, totalQuantity: 7, quoteItemCount: 2 })

        const payload = eventsNamed('generate_lead')[0][2]
        expect(payload).toMatchObject({ item_count: 3, total_quantity: 7, quote_item_count: 2 })
        expect(payload).not.toHaveProperty('value')
        expect(payload).not.toHaveProperty('currency')
        expect(payload).not.toHaveProperty('items')
    })
})

describe('啟用與撤回', () => {
    test('enableAnalytics 重複呼叫只會真的啟動一次', async () => {
        const a = await load()

        const beforeEnable = window.dataLayer.length

        await a.enableAnalytics()
        const afterFirst = window.dataLayer.length
        expect(afterFirst).toBeGreaterThan(beforeEnable)

        await a.enableAnalytics()

        // addGtag() 每跑一次就多註冊一組 router.afterEach，第二次沒被擋住的話
        // 之後每次換頁都會送出兩筆 page_view
        expect(window.dataLayer).toHaveLength(afterFirst)
    })

    test('disableAnalytics 會停用 tag 並清掉 GA cookie', async () => {
        const a = await load()
        document.cookie = '_ga=GA1.1.999; path=/'
        document.cookie = `_ga_TESTID=session; path=/`

        a.disableAnalytics()

        // 只清 cookie 不夠：pageTracker 的 afterEach 不經過 track() 的守衛，
        // 沒有這個旗標的話撤回同意等於沒發生
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
        expect(document.cookie).not.toContain('_ga')
    })

    test('撤回之後再次同意，會把停用旗標拿掉', async () => {
        const a = await load()

        a.disableAnalytics()
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)

        await a.enableAnalytics()

        expect(window[`ga-disable-${TAG_ID}`]).toBeUndefined()
    })
})
