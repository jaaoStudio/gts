import { defineStore } from 'pinia'
import { productService } from '../services/productService'

export const useCategoryStore = defineStore('category', {
    state: () => ({
        categories: [],
        loading: false,
        loaded: false,
        error: null,
        // 首頁分類卡的商品圖預覽，形如 { [categoryId]: [{ id, name, image }] }
        previews: {},
        previewsLoading: false,
    }),

    getters: {
        /**
         * 核心底層 Getter：根據 slug 查找完整分類物件
         */
        getCategoryBySlug: (state) => (slug) => {
            if (!slug) return null;
            const target = String(slug).trim().toLowerCase();
            return state.categories.find(c => c.slug && String(c.slug).trim().toLowerCase() === target) || null;
        },

        /**
         * 複用底層 Getter 找名稱
         */
        getCategoryNameBySlug() {
            return (slug) => {
                const found = this.getCategoryBySlug(slug);
                return found ? found.name : slug;
            }
        },

        /**
         * 複用底層 Getter 找 ID
         */
        getCategoryIdBySlug() {
            return (slug) => {
                const found = this.getCategoryBySlug(slug);
                return found ? found.id : null;
            }
        },

        /**
         * 根據 id 查找分類
         */
        getCategoryById: (state) => (id) => {
            return state.categories.find(c => c.id === id)
        },

        /**
         * 獲取分類樹狀結構 (Root -> Children)
         */
        categoryTree: (state) => {
            if (!Array.isArray(state.categories)) {
                return [];
            }
            const buildTree = (parentId = null) => {
                return state.categories
                    .filter(c => c.parent === parentId) // 找出當前層級的節點
                    .map(c => ({
                        ...c,
                        children: buildTree(c.id) // 遞迴找子節點
                    }))
                    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
            }
            return buildTree(null)
        },

        /**
         * 獲取麵包屑路徑 (Root -> Leaf)
         */
        getCategoryBreadcrumb() {
            return (slug) => {
                const path = []
                let current = this.getCategoryBySlug(slug);

                while (current) {
                    path.unshift(current)
                    current = current.parent ? this.getCategoryById(current.parent) : null
                }
                return path
            }
        }
    },

    actions: {
        /**
         * 遞迴獲取某分類及其所有子分類的 ID 列表
         */
        getAllChildIds(categoryId) {
            if (!categoryId) return []

            const ids = [categoryId]
            const directChildren = this.categories.filter(c => c.parent === categoryId)

            for (const child of directChildren) {
                ids.push(...this.getAllChildIds(child.id))
            }
            return ids
        },

        /**
         * 獲取所有分類（有快取機制，只會呼叫一次 API）
         */
        async fetchCategories() {
            // 已經載入過就直接返回
            if (this.loaded) return this.categories

            // 正在載入中，等待完成
            if (this.loading) {
                return new Promise((resolve) => {
                    const unwatch = this.$subscribe((mutation, state) => {
                        if (state.loaded) {
                            unwatch()
                            resolve(state.categories)
                        }
                    })
                })
            }

            this.loading = true
            this.error = null

            try {
                this.categories = await productService.getCategories()
                this.loaded = true
                return this.categories
            } catch (err) {
                this.error = 'Failed to load categories'
                console.error('Error loading categories:', err)
                throw err
            } finally {
                this.loading = false
            }
        },

        /**
         * 載入指定分類的商品圖預覽（首頁分類卡用）。
         * 只補尚未載入過的分類，重複進出首頁不會重打 API。
         */
        async fetchCategoryPreviews(categoryIds = []) {
            const missing = categoryIds.filter((id) => id && !this.previews[id])
            if (!missing.length || this.previewsLoading) return this.previews

            this.previewsLoading = true
            try {
                // 卡片只放一張圖，多撈是浪費頻寬
                const fetched = await productService.getCategoryPreviews(missing, 1)
                this.previews = { ...this.previews, ...fetched }
                return this.previews
            } catch (err) {
                // 預覽圖純屬裝飾，失敗就讓分類卡維持無圖樣式，不要影響整頁
                console.error('Error loading category previews:', err)
                return this.previews
            } finally {
                this.previewsLoading = false
            }
        },

        /**
         * 強制重新載入分類（用於後台更新後刷新）
         */
        async refreshCategories() {
            this.loaded = false
            this.previews = {}   // 分類重載後預覽圖也要跟著失效，否則會留著舊分類的圖
            return await this.fetchCategories()
        },
    },
})
