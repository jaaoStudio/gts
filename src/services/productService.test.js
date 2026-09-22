// productMapper 是純函式，但先前一條測試都沒有——而**卡片的起價規則就住在這裡**。
// ProductDetail.test.js 把整個 productService mock 掉，所以那邊測不到這一段：
// 起價算錯不會有任何測試變紅，只會讓每張卡片安靜地寫錯價格。

import { describe, expect, test, vi } from 'vitest'

// utils/directus 在模組載入時就用 import.meta.env 建 SDK client，CI 沒有 .env 會炸
vi.mock('../utils/directus')

import { displayPrices, productMapper } from './productService'

// Directus 回來的原始形狀（欄位名與 mapper 產出不同，這正是 mapper 要處理的）
const variant = (over = {}) => ({
    id: 1, spec_name: '240mm', price: 290, stock: 3, sku: 'S-1',
    status: 'published', variant_image: null, can_ship_cvs: true,
    is_accessory: false, ...over,
})

const raw = (over = {}) => ({
    id: 'p1', name: '折合鋸', slug: 'p-1', image: null, gallery: [],
    variants: [], tags: [], categories: [], ...over,
})

describe('displayPrices（起價與價格區間共用的那條規則）', () => {
    test('只算規格，不算配件', () => {
        expect(displayPrices([
            variant({ id: 1, price: 280 }),
            variant({ id: 2, price: 300 }),
            variant({ id: 3, price: 70, is_accessory: true }),
        ])).toEqual([280, 300])
    })

    test('規格全是詢價時才退回全部——否則整件商品會變成 0 元', () => {
        expect(displayPrices([
            variant({ id: 1, price: null }),
            variant({ id: 2, price: 70, is_accessory: true }),
        ])).toEqual([70])
    })

    test('price 是 undefined 也要濾掉，不能讓 Math.min 吐出 NaN', () => {
        const v = variant({ id: 1 })
        delete v.price
        expect(displayPrices([v, variant({ id: 2, price: 280 })])).toEqual([280])
    })

    test('沒有任何價格時回空陣列，交給呼叫端決定顯示什麼', () => {
        expect(displayPrices([variant({ price: null })])).toEqual([])
        expect(displayPrices([])).toEqual([])
    })
})

describe('mapProduct', () => {
    test('起價取規格的最低價，不是配件的', () => {
        const p = productMapper.mapProduct(raw({
            variants: [
                variant({ id: 1, price: 280 }),
                variant({ id: 2, price: 300 }),
                variant({ id: 3, price: 70, is_accessory: true }),
            ],
        }))
        // 70 是螺絲組的價格，客人會以為 70 元買得到鋸子
        expect(p.price).toBe(280)
    })

    // ⚠️ 這條守的是一個看不見的耦合：起價規則靠 LIST_FIELDS 的 'variants.*' 把
    // is_accessory 帶回來。哪天為了縮小 payload 改成逐一列欄位而漏掉它，
    // is_accessory 會變 undefined、配件全被當成規格，卡片安靜地退回「NT$70 起」。
    test('欄位沒帶回 is_accessory 時，起價會退回錯的值——這就是它必須在 LIST_FIELDS 裡的理由', () => {
        const noFlag = variant({ id: 3, price: 70 })
        delete noFlag.is_accessory
        const p = productMapper.mapProduct(raw({
            variants: [variant({ id: 1, price: 280 }), noFlag],
        }))
        expect(p.price).toBe(70)
    })

    test('下架的規格不進前台，也不參與最低價', () => {
        const p = productMapper.mapProduct(raw({
            variants: [
                variant({ id: 1, price: 280 }),
                variant({ id: 2, price: 99, status: 'draft' }),
                variant({ id: 3, price: 50, status: 'archived' }),
            ],
        }))
        expect(p.variants).toHaveLength(1)
        expect(p.price).toBe(280)
    })

    test('status 為空的舊資料不可以被誤砍', () => {
        const p = productMapper.mapProduct(raw({
            variants: [variant({ id: 1, price: 280, status: null })],
        }))
        expect(p.variants).toHaveLength(1)
    })

    test('圖片給的是整組尺寸物件，不是網址字串', () => {
        const p = productMapper.mapProduct(raw({
            image: 'main-uuid',
            gallery: [{ directus_files_id: 'g1' }],
            variants: [variant({ variant_image: 'v1' })],
        }))
        expect(p.mainImage).toEqual({
            id: 'main-uuid',
            thumb: 'https://assets.test/main-uuid?key=thumb',
            card: 'https://assets.test/main-uuid?key=card',
            detail: 'https://assets.test/main-uuid?key=detail',
            full: 'https://assets.test/main-uuid?key=full',
        })
        expect(p.gallery[0].id).toBe('g1')
        expect(p.variants[0].images.id).toBe('v1')
        // image 必須是字串：訂購單 store 會把它存進 localStorage，物件不能序列化
        expect(p.image).toBe('https://assets.test/main-uuid?key=card')
        expect(p.variants[0].image).toBe('https://assets.test/v1?key=card')
        // og:image 走 social（JPEG），不是 WebP
        expect(p.socialImage).toBe('https://assets.test/main-uuid?key=social')
    })

    test('沒有圖時各欄位是 null 而不是壞掉的網址', () => {
        const p = productMapper.mapProduct(raw({ variants: [variant()] }))
        expect(p.image).toBeNull()
        expect(p.mainImage).toBeNull()
        expect(p.socialImage).toBeNull()
        expect(p.variants[0].images).toBeNull()
        expect(p.variants[0].image).toBeNull()
    })
})
