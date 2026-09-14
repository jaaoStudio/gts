// @vitest-environment jsdom
//
// 需要 DOM：createWebHistory() 讀 window.location。

import { describe, expect, test } from 'vitest'
import router from './index'

describe('分析排除規則', () => {
    test('需要登入的路由一律不得送進分析', () => {
        const authed = router.getRoutes().filter((r) => r.meta?.requiresAuth)

        expect(authed.length).toBeGreaterThan(0)
        for (const route of authed) {
            // 這些頁只有本人看得到，路徑還帶訂購單 id——漏標記會讓報表被一次性路徑洗版。
            // main.js 的 pageTracker.exclude 完全依賴這個旗標。
            expect(route.meta.noAnalytics, `${route.path} 少了 meta.noAnalytics`).toBe(true)
        }
    })
})
