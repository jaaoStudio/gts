// @vitest-environment jsdom
//
// 需要 DOM：clearGaCookies() 讀寫 document.cookie 與 location.hostname。

import { beforeEach, describe, expect, test, vi } from 'vitest'

const TAG_ID = 'G-TESTID'
const CONSENT_KEY = 'gts_analytics_consent'

/**
 * 取全新的模組實例。`consent` ref 與 `started` 旗標都是模組層狀態，共用會讓測試互相
 * 汙染——`started` 一旦為 true 就再也測不到「第一次啟動」。
 *
 * `resource.inject: false` 讓它不下載 gtag.js（測試不碰網路），但 dataLayer 照樣會被
 * 填，所以斷言拿到的是真實 payload 而不是 mock 的呼叫紀錄。
 */
const load = async () => {
    vi.resetModules()
    window.dataLayer = []
    const gtag = await import('vue-gtag')
    gtag.configure({ tagId: TAG_ID, resource: { inject: false } })
    return await import('./analytics')
}

// 只看 event：configure() 自己會推 js + config 兩筆，那是設定不是追蹤資料
const trackingEvents = () =>
    window.dataLayer.map((args) => Array.from(args)).filter((a) => a[0] === 'event')
const eventsNamed = (name) => trackingEvents().filter((a) => a[1] === name)
const firstItem = (name) => eventsNamed(name)[0][2].items[0]

const product = { id: 'prod-1', name: '專利水泥攪拌器轉接頭組', category: { name: '接桿/轉接頭' } }

beforeEach(() => {
    delete window[`ga-disable-${TAG_ID}`]
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
        // banner 的顯示條件是 consent === null，所以 'denied' 必須與「沒問過」分得開
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
        a.trackAddToCart(product, 1, '1母2子')
        a.trackGenerateLead({ itemCount: 1, totalQuantity: 1, quoteItemCount: 0 })

        expect(trackingEvents()).toHaveLength(0)
    })

    test('拒絕之後也一樣', async () => {
        const a = await load()
        a.setConsent('denied')

        a.trackViewItem(product)

        expect(trackingEvents()).toHaveLength(0)
    })

    test('同意前的行為不得在事後被補送', async () => {
        const a = await load()

        a.trackViewItem(product)
        a.setConsent('granted')
        await new Promise((r) => setTimeout(r, 0))

        // 啟動時會 flush 排隊中的事件。守衛若失守，未同意期間的瀏覽紀錄會在使用者
        // 按下接受的瞬間整批送給 Google——「不推 dataLayer」那條斷言看不到這件事
        expect(eventsNamed('view_item')).toHaveLength(0)
    })
})

describe('事件 payload', () => {
    test('view_item 與 add_to_cart 必須用同一個 item_id', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackViewItem(product)
        a.trackAddToCart(product, 2, '1母2子')

        expect(firstItem('add_to_cart').item_id).toBe(firstItem('view_item').item_id)
    })

    test('規格放在 item_variant，不混進 item_id', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackAddToCart(product, 2, '1母2子')

        const item = firstItem('add_to_cart')
        expect(item.item_variant).toBe('1母2子')
        expect(item.quantity).toBe(2)
        expect(item.item_id).not.toContain('1母2子')
    })

    test('商品事件不帶任何金額欄位', async () => {
        const a = await load()
        a.setConsent('granted')

        a.trackViewItem(product)
        a.trackAddToCart(product, 1, '1母2子')

        for (const name of ['view_item', 'add_to_cart']) {
            expect(firstItem(name)).not.toHaveProperty('price')
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
    test('setConsent 自己套用副作用，呼叫端不必記得配對', async () => {
        const a = await load()

        a.setConsent('denied')

        // 曾經漏掉這一步：只寫了狀態沒停用 tag，撤回同意等於沒發生
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('接受會真的啟動 GA', async () => {
        const a = await load()
        const before = window.dataLayer.length

        a.setConsent('granted')
        await new Promise((r) => setTimeout(r, 0))

        // 沒有這條的話，「接受按了等於沒事發生、永遠收不到資料」不會被任何東西擋下
        expect(window.dataLayer.length).toBeGreaterThan(before)
    })

    test('重新詢問（null）也必須停用——banner 顯示期間不得繼續追蹤', async () => {
        const a = await load()
        a.setConsent('granted')
        await new Promise((r) => setTimeout(r, 0))

        a.reopenConsent()

        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('啟動前送出的事件會排隊補送，不會排在 config 前面被丟掉', async () => {
        localStorage.setItem(CONSENT_KEY, 'granted')
        const a = await load()

        a.trackViewItem(product)
        expect(eventsNamed('view_item')).toHaveLength(0)

        await a.enableAnalytics()

        expect(eventsNamed('view_item')).toHaveLength(1)
    })

    test('enableAnalytics 重複呼叫只會真的啟動一次', async () => {
        const a = await load()
        const before = window.dataLayer.length

        await a.enableAnalytics()
        const afterFirst = window.dataLayer.length
        expect(afterFirst).toBeGreaterThan(before)

        await a.enableAnalytics()

        expect(window.dataLayer).toHaveLength(afterFirst)
    })

    test('disableAnalytics 會停用 tag 並清掉 GA cookie', async () => {
        const a = await load()
        document.cookie = '_ga=GA1.1.999; path=/'
        document.cookie = '_ga_TESTID=session; path=/'

        a.disableAnalytics()

        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
        expect(document.cookie).not.toContain('_ga')
    })

    test('其他分頁撤回時，這一頁也要跟著停用', async () => {
        const a = await load()
        a.setConsent('granted')
        await new Promise((r) => setTimeout(r, 0))

        window.dispatchEvent(
            new StorageEvent('storage', { key: CONSENT_KEY, newValue: 'denied' })
        )

        expect(a.consent.value).toBe('denied')
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('撤回之後再次同意，會把停用旗標拿掉', async () => {
        const a = await load()

        a.disableAnalytics()
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)

        await a.enableAnalytics()

        expect(window[`ga-disable-${TAG_ID}`]).toBeUndefined()
    })
})
