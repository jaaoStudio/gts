import { defineStore } from 'pinia'
import { productService } from '../services/productService'
import { getAssetUrl } from '../utils/directus'

const STORAGE_KEY = 'gts_order_items'

// 1399 筆規格中有 374 筆的 spec_name 是匯入時留下的佔位字串 "Default"，
// 不是真的規格名。顯示「規格：Default」對客人和老闆都是雜訊，一律視為未命名。
const normalizeSpecName = (name) => {
    const s = (name || '').trim()
    return s.toLowerCase() === 'default' ? '' : s
}

/**
 * 訂購單（購物車）store。
 *
 * 品項存在 localStorage，但**存下來的是當下的快照**（品名、規格、單價）。
 * 快照會過期，所以 revalidate() 必須在每次開啟訂購單頁時跑一次，
 * 對照 Directus 現況處理三種情況：商品已刪除、已下架、價格已變動。
 * 靜默沿用舊價會讓客人送出他其實看不到的金額，因此一律提示。
 */
export const useOrderStore = defineStore('order', {
    state: () => ({
        items: [],
        loading: false,
        error: null,

        // revalidate() 產生的提示，供訂購單頁顯示後由使用者關閉
        notices: [],
        revalidatedAt: null,
    }),

    getters: {
        /** 品項行數（不是件數）*/
        lineCount: (state) => state.items.length,

        /** 總件數，給 Navbar 的紅點用 */
        count: (state) => state.items.reduce((sum, it) => sum + it.quantity, 0),

        isEmpty: (state) => state.items.length === 0,

        /** 只加總有標價的品項；詢價品項不計入（與後端 Flow 的算法一致）*/
        subtotal: (state) => state.items.reduce(
            (sum, it) => (it.unitPrice == null ? sum : sum + it.unitPrice * it.quantity),
            0,
        ),

        /** 是否含詢價品項 —— 有的話小計不能被當成總價呈現 */
        hasQuoteItems: (state) => state.items.some((it) => it.unitPrice == null),

        /** 詢價品項數，用於「另有 N 項待報價」文案 */
        quoteItemCount: (state) => state.items.filter((it) => it.unitPrice == null).length,

        hasVariant: (state) => (variantId) => state.items.some((it) => it.variantId === variantId),
    },

    actions: {
        /** 從 localStorage 還原。解析失敗就丟棄，不讓壞資料卡住整個頁面 */
        init() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                const parsed = raw ? JSON.parse(raw) : []
                this.items = Array.isArray(parsed) ? parsed.filter((it) => it && it.variantId) : []
            } catch (err) {
                console.error('訂購單資料解析失敗，已重設:', err)
                this.items = []
                localStorage.removeItem(STORAGE_KEY)
            }
        },

        _persist() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
            } catch (err) {
                // 無痕模式或配額滿時會失敗。記憶體中的訂購單仍可用，只是重整後會消失。
                console.error('訂購單無法寫入 localStorage:', err)
            }
        },

        /**
         * 加入品項。同一規格重複加入則累加數量。
         * @param {Object} product - mapProduct 的結果
         * @param {Object} variant - product.variants 之一
         * @param {number} quantity
         */
        add(product, variant, quantity = 1) {
            if (!product || !variant) return

            const qty = Math.max(1, Math.floor(Number(quantity) || 1))
            const existing = this.items.find((it) => it.variantId === variant.id)

            if (existing) {
                existing.quantity += qty
            } else {
                this.items.push({
                    variantId: variant.id,
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    specName: normalizeSpecName(variant.spec_name),
                    sku: variant.sku || '',
                    // null 代表詢價；不要塞 0，那會被誤讀成免費
                    unitPrice: variant.price ?? null,
                    quantity: qty,
                    image: variant.image || product.image || null,
                })
            }

            this._persist()
        },

        updateQuantity(variantId, quantity) {
            const item = this.items.find((it) => it.variantId === variantId)
            if (!item) return

            const qty = Math.floor(Number(quantity) || 0)
            if (qty <= 0) {
                this.remove(variantId)
                return
            }

            item.quantity = qty
            this._persist()
        },

        remove(variantId) {
            this.items = this.items.filter((it) => it.variantId !== variantId)
            this._persist()
        },

        clear() {
            this.items = []
            this.notices = []
            this._persist()
        },

        dismissNotices() {
            this.notices = []
        },

        /**
         * 對照 Directus 現況重新驗證所有品項。
         * 商品被刪除或下架 → 移除該行並提示；價格或品名有異動 → 更新快照並提示。
         * 庫存不做阻擋（沒有收款，由老闆確認），僅在頁面上呈現。
         */
        async revalidate() {
            if (this.isEmpty) {
                this.revalidatedAt = Date.now()
                return
            }

            this.loading = true
            this.error = null
            this.notices = []

            try {
                const ids = this.items.map((it) => it.variantId)
                const fresh = await productService.getVariantsByIds(ids)
                const byId = new Map(fresh.map((v) => [v.id, v]))

                const kept = []
                for (const item of this.items) {
                    const v = byId.get(item.variantId)
                    const product = v && v.product_id

                    // public 與 customer access 兩個 policy 對 products / product_variants
                    // 都帶 status=published filter，所以「已下架」與「已刪除」從前台看是同一件事
                    // ——都是查不到。無法分辨，因此只有一種說法。
                    if (!v || !product) {
                        const label = item.productName + (item.specName ? ` ${item.specName}` : '')
                        this.notices.push({
                            type: 'removed',
                            text: `「${label}」已不再供應，已從訂購單移除。`,
                        })
                        continue
                    }

                    const freshPrice = v.price ?? null
                    if (freshPrice !== item.unitPrice) {
                        this.notices.push({
                            type: 'price',
                            text: `「${item.productName}」的價格已更新為 ${
                                freshPrice == null ? '詢價' : `NT$${freshPrice.toLocaleString()}`
                            }。`,
                        })
                    }

                    kept.push({
                        ...item,
                        // 快照一律以最新資料覆蓋，避免送出客人已經看不到的內容
                        productName: product.name,
                        productSlug: product.slug,
                        specName: normalizeSpecName(v.spec_name),
                        sku: v.sku || '',
                        unitPrice: freshPrice,
                        stock: v.stock ?? null,
                        image: v.variant_image
                            ? getAssetUrl(v.variant_image)
                            : (product.image ? getAssetUrl(product.image) : item.image),
                    })
                }

                this.items = kept
                this._persist()
                this.revalidatedAt = Date.now()
            } catch (err) {
                // 驗證失敗時保留原有品項——寧可讓客人看到舊價，也不要把訂購單清空
                this.error = '無法確認最新價格與供應狀況，以下為您上次看到的內容。'
                console.error('Error revalidating order items:', err)
            } finally {
                this.loading = false
            }
        },
    },
})
