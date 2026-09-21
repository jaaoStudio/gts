// @vitest-environment jsdom
//
// 需要 DOM：createWebHistory() 讀 window.location。

import { describe, expect, test, vi } from 'vitest'

// ⚠️ 少了這行，整個測試檔會在 CI「載入失敗」而不是「測試失敗」——vitest 回報
// `Test Files 1 failed` 但 `Tests N passed`，看起來像全綠，實際上這裡一條都沒跑。
// router 靜態 import 了 ProductDetail.vue，於是拉進 product store → productService
// → utils/directus，而它在模組載入時就用 import.meta.env 建 SDK client。
// 本機有 .env 所以不會炸，CI 沒有（.env 不進版控）。見 utils/__mocks__/directus.js。
vi.mock('../utils/directus')

import router from './index'
import { signalContentReady } from '../utils/contentReady'
import { isExcludedFromAnalytics } from '../utils/analytics'

// scrollBehavior 對「非同步載入資料的頁面」會先等該頁說準備好（見 utils/contentReady）。
// 這一組守的是等待期間使用者又導航走的情況。
//
// ⚠️ 這裡編碼了一個 vue-router 的實作細節：它的 handleScroll 是
//     nextTick().then(scrollBehavior).then(p => p && scrollToPosition(p))
// promise resolve 之後**不會**重新確認路由。哪天升級套件後它自己會檢查了，這些測試
// 仍會過（回傳 false 本來就是合法的「不要捲」），但那時就可以考慮拿掉那個檢查。
describe('scrollBehavior 的過期等待', () => {
    const behavior = (to, savedPosition) =>
        router.options.scrollBehavior(to, {}, savedPosition)

    test('等待期間使用者導航走了，回傳 false 而不是舊位置', async () => {
        await router.push('/')
        const pending = behavior(
            { fullPath: '/products?page=3', meta: { awaitContent: true } },
            { top: 1400 },
        )
        signalContentReady()
        // 回舊位置的話，首頁會被捲到 1400
        expect(await pending).toBe(false)
    })

    test('還停在同一頁時照常還原', async () => {
        await router.push('/products?page=3')
        const pending = behavior(
            { fullPath: '/products?page=3', meta: { awaitContent: true } },
            { top: 1400 },
        )
        signalContentReady()
        expect(await pending).toEqual({ top: 1400 })
    })

    test('沒有 awaitContent 的路由不等待，直接還原', async () => {
        await router.push('/')
        expect(behavior({ fullPath: '/', meta: {} }, { top: 200 })).toEqual({ top: 200 })
    })

    test('首次進入（沒有 savedPosition）一律回到頂端', () => {
        expect(behavior({ fullPath: '/products', meta: { awaitContent: true } }, null))
            .toEqual({ top: 0 })
    })
})

describe('分析排除規則', () => {
    test('需要登入的路由一律不得送進分析', () => {
        const authed = router.getRoutes().filter((r) => r.meta?.requiresAuth)

        expect(authed.length).toBeGreaterThan(0)
        for (const route of authed) {
            // 這些頁只有本人看得到，路徑還帶訂購單 id——漏標記會讓報表被一次性路徑洗版
            expect(route.meta.noAnalytics, `${route.path} 少了 meta.noAnalytics`).toBe(true)
        }
    })

    test('排除判斷本身要認得旗標', () => {
        // 上一條只保證旗標宣告在路由上，這條保證排除判斷讀得懂它。
        // main.js 的接線另由 main.test.js 實際啟動後驗證。
        for (const path of ['/account', '/account/orders', '/account/orders/42', '/order/done/9']) {
            expect(isExcludedFromAnalytics(router.resolve(path)), path).toBe(true)
        }
        for (const path of ['/', '/products', '/product/foo', '/contact']) {
            expect(isExcludedFromAnalytics(router.resolve(path)), path).toBe(false)
        }
    })

    test.each([
        '/account/xxx', '/account/orders/42/x', '/account/orders/42/x?source=email#detail',
        '/order/done', '/order/done/', '/order/done/42/x', '/ACCOUNT/unknown',
    ])('私人 404 不追蹤：%s', (path) => {
        const route = router.resolve(path)

        expect(route.name).toBe('PrivateNotFound')
        expect(route.meta.noAnalytics).toBe(true)
        expect(isExcludedFromAnalytics(route)).toBe(true)
        expect(route.matched.some((record) => record.redirect)).toBe(false)
    })

    test.each(['/order', '/accounting', '/order/done-other', '/totally-missing'])('公開路徑仍可追蹤：%s', (path) => {
        expect(isExcludedFromAnalytics(router.resolve(path))).toBe(false)
    })

    test('公開 404 必須被追蹤', () => {
        const route = router.resolve('/totally-missing')

        // 「哪些連結壞了」正是要從 GA 看出來的東西，排除掉就白做了。
        // 也確認它真的走到 NotFound 而不是被 redirect 吞掉。
        expect(route.name).toBe('NotFound')
        expect(isExcludedFromAnalytics(route)).toBe(false)
    })

    test('每個可導航的路由都必須有 meta.title', () => {
        // routeToPageView 直接讀 meta.title 且沒有 fallback：漏了就送出 undefined，
        // 而 fallback 到 document.title 會拿到「上一頁」的標題，錯得更隱晦
        const navigable = router.getRoutes().filter((r) => r.components)

        expect(navigable.length).toBeGreaterThan(0)
        for (const route of navigable) {
            expect(route.meta?.title, `${route.path} 少了 meta.title`).toBeTruthy()
        }
    })
})
