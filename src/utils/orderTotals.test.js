import { describe, expect, test } from 'vitest'
import { confirmedSubtotal, effectivePrice } from './orderTotals'

// 明細頁的品項欄位用 Directus 的原始命名（snake_case），與 store 裡的 camelCase 不同
const item = (over = {}) => ({ unit_price: 100, confirmed_price: null, quantity: 1, ...over })

describe('effectivePrice', () => {
    test('given_老闆尚未改價_will_沿用下單時的單價', () => {
        expect(effectivePrice(item({ unit_price: 510, confirmed_price: null }))).toBe(510)
    })

    test('given_老闆改過價_will_採用確認價', () => {
        expect(effectivePrice(item({ unit_price: 510, confirmed_price: 550 }))).toBe(550)
    })

    test('given_確認價為0_will_採用0而非退回原價', () => {
        // ?? 與 || 的差別就在這裡：老闆送的品項確認價是 0，用 || 會錯誤地變回 510
        expect(effectivePrice(item({ unit_price: 510, confirmed_price: 0 }))).toBe(0)
    })

    test('given_詢價品項且尚未報價_will_回傳null', () => {
        expect(effectivePrice(item({ unit_price: null, confirmed_price: null }))).toBeNull()
    })

    test('given_詢價品項已報價_will_採用確認價', () => {
        expect(effectivePrice(item({ unit_price: null, confirmed_price: 880 }))).toBe(880)
    })
})

describe('confirmedSubtotal', () => {
    test('given_老闆改過價_will_用確認價而非下單時的單價', () => {
        // 線上真實案例 GTS-260907-0039：下單 510、確認 550、數量 3
        // 參考小計是 1530，但應付金額的基底是 1650——這個落差就是那個 bug 的成因
        const items = [item({ unit_price: 510, confirmed_price: 550, quantity: 3 })]
        expect(confirmedSubtotal(items)).toBe(1650)
    })

    test('given_混合已報價與未報價的品項_will_只加總算得出來的部分', () => {
        const items = [
            item({ unit_price: 100, confirmed_price: null, quantity: 2 }),
            item({ unit_price: null, confirmed_price: null, quantity: 5 }), // 詢價，未報價
            item({ unit_price: null, confirmed_price: 300, quantity: 1 }),  // 詢價，已報價
        ]
        expect(confirmedSubtotal(items)).toBe(500)
    })

    test('given_確認價為0的品項_will_計入為0而不是被跳過', () => {
        const items = [
            item({ unit_price: 100, confirmed_price: 100, quantity: 1 }),
            item({ unit_price: 200, confirmed_price: 0, quantity: 3 }),
        ]
        expect(confirmedSubtotal(items)).toBe(100)
    })

    test('given_沒有品項_will_回傳0', () => {
        expect(confirmedSubtotal([])).toBe(0)
    })

    test('given_items為undefined_will_回傳0而不是拋錯', () => {
        // 明細頁在 order 尚未載入時會傳進 undefined
        expect(confirmedSubtotal(undefined)).toBe(0)
    })

    test('given_全部都是未報價的詢價品項_will_回傳0', () => {
        const items = [item({ unit_price: null, confirmed_price: null, quantity: 9 })]
        expect(confirmedSubtotal(items)).toBe(0)
    })
})

describe('逐行金額與小計的一致性', () => {
    test('given_任何組合_will_逐行加總等於confirmedSubtotal', () => {
        // 這是明細頁對客人的隱含承諾：他把每一行加起來，必須等於小計那個數字
        const items = [
            item({ unit_price: 510, confirmed_price: 550, quantity: 3 }),
            item({ unit_price: 100, confirmed_price: null, quantity: 2 }),
            item({ unit_price: null, confirmed_price: null, quantity: 5 }),
            item({ unit_price: 200, confirmed_price: 0, quantity: 1 }),
        ]

        const byLine = items.reduce((sum, it) => {
            const price = effectivePrice(it)
            return price == null ? sum : sum + price * it.quantity
        }, 0)

        expect(byLine).toBe(confirmedSubtotal(items))
    })
})
