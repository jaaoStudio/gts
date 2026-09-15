// @vitest-environment jsdom
//
// 需要 DOM：_clearGaCookies() 讀寫 document.cookie 與 location.hostname。
//
// 這裡的失效全是靜默的——撤回同意變成空操作、啟動被呼叫兩次而每次換頁送兩筆、
// 同意前的瀏覽紀錄在按下接受時被整批補送。三種都不拋錯。

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { configure } from 'vue-gtag'
import { useConsentStore } from './consent'

const TAG_ID = 'G-TESTID'
const STORAGE_KEY = 'gts_analytics_consent'

// inject:false 不下載 gtag.js（測試不碰網路），但 dataLayer 照樣會被填，
// 所以斷言拿到的是真實 payload 而不是 mock 的呼叫紀錄
configure({ tagId: TAG_ID, resource: { inject: false } })

const trackingEvents = () =>
    window.dataLayer.map((args) => Array.from(args)).filter((a) => a[0] === 'event')

beforeEach(() => {
    setActivePinia(createPinia())
    window.dataLayer = []
    delete window[`ga-disable-${TAG_ID}`]
})

describe('三態', () => {
    test('沒問過時是 null', () => {
        const store = useConsentStore()
        store.init()
        expect(store.value).toBe(null)
        expect(store.isUndecided).toBe(true)
    })

    test('已拒絕過的人重新載入時不會被再問一次', () => {
        localStorage.setItem(STORAGE_KEY, 'denied')
        const store = useConsentStore()

        store.init()

        // banner 的顯示條件是 isUndecided，所以 'denied' 必須與「沒問過」分得開
        expect(store.value).toBe('denied')
        expect(store.isUndecided).toBe(false)
    })

    test('set 與 reopen 會同步 state 與 localStorage', () => {
        const store = useConsentStore()
        store.init()

        store.set('denied')
        expect(store.value).toBe('denied')
        expect(localStorage.getItem(STORAGE_KEY)).toBe('denied')

        store.reopen()
        expect(store.value).toBe(null)
        expect(localStorage.getItem(STORAGE_KEY)).toBe(null)
    })

    test('localStorage 寫不進去時，記憶體狀態仍然正確', () => {
        const store = useConsentStore()
        store.init()
        vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
            throw new Error('QuotaExceededError')
        })

        store.set('granted')

        // 同意不重載頁面，所以這個記憶體狀態撐得過這次瀏覽（無痕模式的路徑）
        expect(store.value).toBe('granted')
    })
})

describe('未同意時不得送出任何東西', () => {
    test('track 不推 dataLayer', () => {
        const store = useConsentStore()
        store.init()

        store.track('view_item', { items: [] })

        expect(trackingEvents()).toHaveLength(0)
    })

    test('同意前的行為不得在事後被補送', async () => {
        const store = useConsentStore()
        store.init()

        store.track('view_item', { items: [] })
        store.set('granted')
        await new Promise((r) => setTimeout(r, 0))

        // 啟動時會 flush 排隊中的事件。守衛若失守，未同意期間的瀏覽紀錄會在使用者
        // 按下接受的瞬間整批送給 Google——「不推 dataLayer」那條斷言看不到這件事
        expect(trackingEvents()).toHaveLength(0)
    })
})

describe('啟用與撤回', () => {
    test('set 自己套用副作用，呼叫端不必記得配對', () => {
        const store = useConsentStore()
        store.init()

        store.set('denied')

        // 曾經漏掉這一步：只寫了狀態沒停用 tag，撤回同意等於沒發生
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('接受會真的啟動 GA', async () => {
        const store = useConsentStore()
        store.init()
        const before = window.dataLayer.length

        store.set('granted')
        await new Promise((r) => setTimeout(r, 0))

        // 沒有這條的話，「接受按了等於沒事發生、永遠收不到資料」不會被任何東西擋下
        expect(window.dataLayer.length).toBeGreaterThan(before)
    })

    test('重新詢問（null）也必須停用——banner 顯示期間不得繼續追蹤', async () => {
        const store = useConsentStore()
        store.init()
        store.set('granted')
        await new Promise((r) => setTimeout(r, 0))

        store.reopen()

        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('啟動前送出的事件會排隊補送，不會排在 config 前面被丟掉', async () => {
        localStorage.setItem(STORAGE_KEY, 'granted')
        const store = useConsentStore()
        store.init()

        store.track('view_item', { items: [] })
        expect(trackingEvents()).toHaveLength(0)

        await store.enable()

        expect(trackingEvents()).toHaveLength(1)
    })

    test('enable 重複呼叫只會真的啟動一次', async () => {
        const store = useConsentStore()
        store.init()
        const before = window.dataLayer.length

        await store.enable()
        const afterFirst = window.dataLayer.length
        expect(afterFirst).toBeGreaterThan(before)

        await store.enable()

        // addGtag() 每跑一次就多註冊一組 router.afterEach，第二次沒被擋住的話
        // 之後每次換頁都會送出兩筆 page_view
        expect(window.dataLayer).toHaveLength(afterFirst)
    })

    test('停用會清掉 GA cookie', () => {
        const store = useConsentStore()
        store.init()
        document.cookie = '_ga=GA1.1.999; path=/'
        document.cookie = '_ga_TESTID=session; path=/'

        store.set('denied')

        expect(document.cookie).not.toContain('_ga')
    })

    test('撤回之後再次同意，會把停用旗標拿掉', async () => {
        const store = useConsentStore()
        store.init()
        store.set('denied')
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)

        await store.enable()

        expect(window[`ga-disable-${TAG_ID}`]).toBeUndefined()
    })

    test('其他分頁撤回時，這一頁也要跟著停用', async () => {
        const store = useConsentStore()
        store.init()
        store.set('granted')
        await new Promise((r) => setTimeout(r, 0))

        window.dispatchEvent(
            new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'denied' })
        )

        expect(store.value).toBe('denied')
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })
})
