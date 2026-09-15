// @vitest-environment jsdom
//
// 需要 DOM：createWebHistory() 讀 window.location。

import { describe, expect, test } from 'vitest'
import router from './index'
import { isExcludedFromAnalytics } from '../utils/analytics'

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
