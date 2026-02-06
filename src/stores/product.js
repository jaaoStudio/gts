import { defineStore } from 'pinia'
import { productService, productMapper } from '../services/productService'
import { useCategoryStore } from './category'

export const useProductStore = defineStore('product', {
    state: () => ({
        products: [],
        loading: false,
        error: null,

        // 分頁相關狀態
        currentPage: 1,
        itemsPerPage: 12,
        totalItems: 0,
        totalPages: 0,

        // 篩選條件
        currentFilters: {
            categorySlug: '',
            keyword: ''
        }
    }),

    getters: {
        /**
         * 是否有下一頁
         */
        hasNextPage: (state) => state.currentPage < state.totalPages,

        /**
         * 是否有上一頁
         */
        hasPrevPage: (state) => state.currentPage > 1,
    },

    actions: {
        /**
         * 獲取產品（支援分頁與篩選）
         * @param {number} page - 頁碼
         * @param {Object} filters - 篩選條件
         * @param {string} filters.categorySlug - 分類 slug
         * @param {string} filters.keyword - 搜尋關鍵字
         */
        async fetchProducts(page = 1, filters = {}) {
            this.loading = true
            this.error = null
            this.currentPage = page

            // 儲存當前篩選條件
            this.currentFilters = {
                categorySlug: filters.categorySlug || '',
                keyword: filters.keyword || ''
            }

            try {
                // 準備分類 ID 列表（包含子分類）
                let categoryIds = []
                if (this.currentFilters.categorySlug) {
                    const categoryStore = useCategoryStore()
                    // 確保分類資料已載入
                    if (!categoryStore.loaded) {
                        await categoryStore.fetchCategories()
                    }

                    const rootId = categoryStore.getCategoryIdBySlug(this.currentFilters.categorySlug)
                    if (rootId) {
                        categoryIds = categoryStore.getAllChildIds(rootId)
                    }
                }

                const response = await productService.getFilteredProducts({
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    categoryIds: categoryIds,
                    keyword: this.currentFilters.keyword
                })
                const items = response.data
                const meta = response.meta

                this.products = items

                if (meta) {
                    this.totalItems = meta.filter_count || meta.total_count || 0
                    this.totalPages = meta.total_pages || 0
                }
            } catch (err) {
                this.error = 'Failed to load products'
                console.error('Error details:', err)
            } finally {
                this.loading = false
            }
        },

        /**
         * 下一頁
         */
        async nextPage() {
            if (this.hasNextPage) {
                await this.fetchProducts(this.currentPage + 1, this.currentFilters)
            }
        },

        /**
         * 上一頁
         */
        async prevPage() {
            if (this.hasPrevPage) {
                await this.fetchProducts(this.currentPage - 1, this.currentFilters)
            }
        },

        /**
         * 跳轉到指定頁
         */
        async goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                await this.fetchProducts(page, this.currentFilters)
            }
        },

        /**
         * 獲取精選產品（不需要分頁）
         */
        async fetchFeaturedProducts() {
            this.loading = true
            this.error = null
            try {
                const response = await productService.getFeatured(4)
                const items = Array.isArray(response) ? response : (response.data || response)
                this.products = items
            } catch (err) {
                this.error = 'Failed to load featured products'
                console.error(err)
            } finally {
                this.loading = false
            }
        },

        /**
         * 根據分類獲取產品
         */
        /**
         * 根據分類獲取產品
         */
        async fetchProductsByCategory(categoryId, page = 1) {
            this.loading = true
            this.error = null
            this.currentPage = page

            try {
                const categoryStore = useCategoryStore()
                if (!categoryStore.loaded) {
                    await categoryStore.fetchCategories()
                }
                const categoryIds = categoryStore.getAllChildIds(categoryId)

                const response = await productService.getFilteredProducts({
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    categoryIds: categoryIds
                })

                const items = Array.isArray(response) ? response : (response.data || response)
                const meta = response.meta

                this.products = items

                if (meta) {
                    this.totalItems = meta.filter_count || meta.total_count || 0
                    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage)
                }
            } catch (err) {
                this.error = 'Failed to load products by category'
                console.error(err)
            } finally {
                this.loading = false
            }
        }
    }
})
