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
        // 上一條只保證旗標在，這條保證消費端真的讀它——否則旗標可以完美無缺，
        // 而 main.js 那邊被改成恆 false 也不會有人發現
        for (const path of ['/account', '/account/orders', '/account/orders/42', '/order/done/9']) {
            expect(isExcludedFromAnalytics(router.resolve(path)), path).toBe(true)
        }
        for (const path of ['/', '/products', '/product/foo', '/contact']) {
            expect(isExcludedFromAnalytics(router.resolve(path)), path).toBe(false)
        }
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
