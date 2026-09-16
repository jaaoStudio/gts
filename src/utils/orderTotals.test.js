import { describe, expect, test } from 'vitest'
import {
    CVS_BLOCK,
    CVS_IBON,
    SHIPPING,
    confirmedSubtotal,
    cvsBlockReason,
    cvsShippingFee,
    effectivePrice,
    estimateShipping,
    lineTotal,
} from './orderTotals'

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

    test('given_items為null_will_回傳0而不是拋錯', () => {
        // Directus 的空關聯可能回 null 而非 []，這條與上面那條要分開測：
        // 預設參數 `(items = [])` 能過 undefined 那條，卻會在這條拋 TypeError
        expect(confirmedSubtotal(null)).toBe(0)
    })

    test('given_全部都是未報價的詢價品項_will_回傳0', () => {
        const items = [item({ unit_price: null, confirmed_price: null, quantity: 9 })]
        expect(confirmedSubtotal(items)).toBe(0)
    })
})

describe('lineTotal', () => {
    // 明細頁每一列顯示的數字。OrderDetail.vue 的 itemTotal() 只做格式化，
    // 金額一律由這裡算——所以這幾條同時是在守畫面上那一欄。
    test('given_老闆改過價_will_用確認價計算這一行', () => {
        // 逐行若退回 unit_price（510×3=1530）而小計用確認價（1650），
        // 客人自己加起來就對不上——GTS-260907-0039 就是這個形狀
        expect(lineTotal(item({ unit_price: 510, confirmed_price: 550, quantity: 3 }))).toBe(1650)
    })

    test('given_老闆尚未改價_will_用下單時的單價計算', () => {
        expect(lineTotal(item({ unit_price: 100, confirmed_price: null, quantity: 2 }))).toBe(200)
    })

    test('given_確認價為0_will_回傳0而不是退回原價', () => {
        expect(lineTotal(item({ unit_price: 200, confirmed_price: 0, quantity: 3 }))).toBe(0)
    })

    test('given_詢價品項尚未報價_will_回傳null而不是0', () => {
        // 0 會在畫面上顯示成「NT$0」，但這一行的真實狀態是「待報價」
        expect(lineTotal(item({ unit_price: null, confirmed_price: null, quantity: 5 }))).toBeNull()
    })
})

describe('逐行金額與小計的一致性', () => {
    test('given_任何組合_will_逐行加總等於confirmedSubtotal', () => {
        // 這是明細頁對客人的隱含承諾：他把每一行加起來，必須等於小計那個數字。
        // 這裡刻意用 lineTotal 累加而不是複製 confirmedSubtotal 的算式——
        // 若哪天 confirmedSubtotal 改成不走 lineTotal，這條就會紅。
        const items = [
            item({ unit_price: 510, confirmed_price: 550, quantity: 3 }),
            item({ unit_price: 100, confirmed_price: null, quantity: 2 }),
            item({ unit_price: null, confirmed_price: null, quantity: 5 }),
            item({ unit_price: 200, confirmed_price: 0, quantity: 1 }),
        ]

        const byLine = items.reduce((sum, it) => sum + (lineTotal(it) ?? 0), 0)

        expect(byLine).toBe(confirmedSubtotal(items))
        expect(byLine).toBe(1850)
    })
})

describe('cvsShippingFee', () => {
    // 7-11 公告費率：代收 1~1000 收 60，之後每千元跳一階到 5000 的 100。
    test.each([
        [0, 60],
        [500, 60],
        [2500, 80],
        [3500, 90],
    ])('given_小計%i_will_運費%i', (subtotal, fee) => {
        expect(cvsShippingFee(subtotal)).toBe(fee)
    })

    describe('級距查的是含運的代收金額，不是小計', () => {
        // 這一組是整個函式存在的理由。少了疊代，前台顯示 60 而老闆在後台建單打 70——
        // 客人是在取貨櫃台當場發現差額的。
        test('given_小計950_will_收70而不是查表直接得到的60', () => {
            // 950 查表得 60，但代收其實是 950+60=1010，已經跨進 1001–2000 階
            expect(cvsShippingFee(950)).toBe(70)
        })

        test('given_剛好停在階界上的940_will_維持60不多跳一階', () => {
            // 940+60=1000 仍在第一階（含 1000 本身），不該被推到 70
            expect(cvsShippingFee(940)).toBe(60)
        })

        test('given_下一階的界線1930_will_維持70', () => {
            expect(cvsShippingFee(1930)).toBe(70)
        })

        test('given_1940_will_跳到80', () => {
            expect(cvsShippingFee(1940)).toBe(80)
        })
    })

    test('given_任何小計_will_運費與它自己造成的代收金額一致', () => {
        // 這條是整個疊代的規格：算出的運費，必須正好是 7-11 對「含這筆運費的代收
        // 金額」所收的那一階。刻意在這裡重述一次官方級距而不是引用實作的那張表——
        // 共用同一份資料的話，表改錯了兩邊會一起錯，這條就白守了。
        const published = (collected) =>
            collected <= 1000 ? 60
                : collected <= 2000 ? 70
                    : collected <= 3000 ? 80
                        : collected <= 4000 ? 90
                            : 100

        for (const subtotal of [0, 940, 950, 1930, 1940, 2999, 4000, 4900]) {
            const fee = cvsShippingFee(subtotal)
            expect(published(subtotal + fee)).toBe(fee)
        }
    })

    test('given_已超過代收上限_will_回最高階而不是undefined', () => {
        // 這種單會先被 cvsBlockReason 擋掉，但函式本身不能因為找不到級距就炸
        expect(cvsShippingFee(9000)).toBe(100)
    })
})

describe('cvsBlockReason', () => {
    const reason = ({ subtotal = 0, allItemsShippable = true } = {}) =>
        cvsBlockReason({ subtotal, allItemsShippable })

    test('given_全部可寄且金額在上限內_will_不擋', () => {
        expect(reason({ subtotal: 1200 })).toBeNull()
    })

    test('given_任一品項不可超商寄送_will_回oversize', () => {
        expect(reason({ subtotal: 100, allItemsShippable: false })).toBe(CVS_BLOCK.oversize)
    })

    test('given_同時超尺寸與超金額_will_先報尺寸', () => {
        // 兩個原因都成立時文案只能挑一個。尺寸是客人改不動的（得換商品），
        // 金額他還能自己減量，所以先講死結那個。
        expect(reason({ subtotal: 99999, allItemsShippable: false })).toBe(CVS_BLOCK.oversize)
    })

    describe('代收上限比的是含運金額', () => {
        // 上限管的是店員實際收的數字，運費是它的一部分。拿小計去比會讓
        // 小計 5,000（代收 5,100）過關，等到老闆建單才被 7-11 擋下來。
        test('given_小計恰好等於上限_will_因為加上運費而被擋', () => {
            expect(reason({ subtotal: CVS_IBON.maxCollectable })).toBe(CVS_BLOCK.overLimit)
        })

        test('given_小計4900_will_不擋因為含運剛好等於上限', () => {
            // 4900 + 100 = 5000，等於上限本身仍可收
            expect(reason({ subtotal: 4900 })).toBeNull()
        })

        test('given_小計4901_will_被擋', () => {
            expect(reason({ subtotal: 4901 })).toBe(CVS_BLOCK.overLimit)
        })
    })
})

describe('estimateShipping（超商）', () => {
    // 超商走同一個出口，但它是另一套規則：永遠 charged，沒有免運可湊。
    const cvs = (subtotal) =>
        estimateShipping({ isCvs: true, subtotal, hasQuoteItems: false, rule: { fee: 140, threshold: 2000 } })

    test('given_已達宅配免運門檻_will_仍然收費', () => {
        // 免運門檻是老闆對宅配運費的補貼，而交貨便的運費是 7-11 從代收款直接扣走的。
        // 套用門檻等於老闆每單自吃 60–100。
        expect(cvs(4000).state).toBe(SHIPPING.charged)
        expect(cvs(4000).amount).toBe(cvsShippingFee(4000))
    })

    test('given_超商_will_不給gap只給說明', () => {
        // 有 gap 等於在暗示「再買一點就免運」，而超商根本沒有免運
        const result = cvs(500)
        expect(result.gap).toBeUndefined()
        expect(result.note).toContain('不適用免運門檻')
    })

    test('given_宅配設定不完整_will_超商仍算得出運費', () => {
        // 超商不吃 site_settings，宅配那邊沒設定不該連累它
        expect(estimateShipping({ isCvs: true, subtotal: 500, hasQuoteItems: false, rule: null }))
            .toMatchObject({ state: SHIPPING.charged, amount: 60 })
    })

    test('given_含詢價品項_will_不給數字', () => {
        // 級距查的是代收金額，而詢價品項報價後會把它整個墊高——一項報 4,000 的就跳
        // 三階，先講的數字必然被推翻。同 ADR 0003 第 4 條：只在答案確定時才給數字。
        expect(estimateShipping({ isCvs: true, subtotal: 500, hasQuoteItems: true, rule: null }).state)
            .toBe(SHIPPING.quote)
    })

    test('given_含詢價品項_will_不給數字但仍可選超商', () => {
        // 這兩件事刻意不同調：cvsBlockReason 問「會不會超過上限」，詢價只會讓它更
        // 超標，所以敢判；estimateShipping 問「收多少」，詢價讓答案未定，所以不敢講。
        // 誤把兩邊統一的話，會變成「有詢價品項就不給選超商」——那不是規格要的。
        //
        // hasQuoteItems 刻意傳進去：cvsBlockReason 不收這個參數，這條就是在釘住
        // 「它應該繼續不收」——有人日後把詢價判斷加進去，這裡會紅。
        expect(cvsBlockReason({ subtotal: 500, allItemsShippable: true, hasQuoteItems: true }))
            .toBeNull()
    })
})

describe('estimateShipping（宅配）', () => {
    // 正式站的設定：一箱 140、滿 2000 免運
    const rule = { fee: 140, threshold: 2000 }
    const est = ({ subtotal = 0, hasQuoteItems = false, ...over } = {}) =>
        estimateShipping({ subtotal, hasQuoteItems, rule: { ...rule, ...over } })

    describe('設定不完整', () => {
        test('given_規則為null_will_回unavailable', () => {
            // 設定是否完整由 settings store 的 shippingRule 認定：缺值、或運費 <= 0
            // （不支援的設定，見該 getter 的註解）都會是 null
            expect(estimateShipping({ subtotal: 0, hasQuoteItems: false, rule: null }).state)
                .toBe(SHIPPING.unavailable)
        })

        test('given_規則為null又有詢價品項_will_unavailable優先', () => {
            expect(estimateShipping({ subtotal: 0, hasQuoteItems: true, rule: null }).state)
                .toBe(SHIPPING.unavailable)
        })
    })

    describe('未達免運門檻', () => {
        test('given_全部標價且未達門檻_will_收費並算出差額', () => {
            expect(est({ subtotal: 1650 })).toEqual({
                state: SHIPPING.charged, amount: 140, gap: 350,
            })
        })

        test('given_差1元到門檻_will_仍然收費', () => {
            expect(est({ subtotal: 1999 })).toEqual({
                state: SHIPPING.charged, amount: 140, gap: 1,
            })
        })

        test('given_空的訂購單_will_收費', () => {
            expect(est({ subtotal: 0 }).state).toBe(SHIPPING.charged)
        })
    })

    describe('達到免運門檻', () => {
        test('given_剛好等於門檻_will_免運', () => {
            // 「滿 2000」含 2000 本身，差一塊錢的爭議客服成本比放寬高
            expect(est({ subtotal: 2000 }).state).toBe(SHIPPING.free)
        })

        test('given_超過門檻_will_免運', () => {
            expect(est({ subtotal: 5000 }).state).toBe(SHIPPING.free)
        })
    })

    describe('含詢價品項', () => {
        test('given_未達門檻又有詢價品項_will_不給數字', () => {
            // 小計 800 但那項詢價的可能報 4000，實際應該免運。
            // 給 140 這個數字，報價後就會被推翻。
            expect(est({ subtotal: 800, hasQuoteItems: true }).state).toBe(SHIPPING.quote)
        })

        test('given_標價部分已達門檻_will_免運而不是quote', () => {
            // 詢價品項只會讓總額更多，免運是確定的，沒有不敢講的理由
            expect(est({ subtotal: 2500, hasQuoteItems: true }).state).toBe(SHIPPING.free)
        })
    })
})
