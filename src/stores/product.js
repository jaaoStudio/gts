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

            // 合併新舊篩選條件
            this.currentFilters = {
                categorySlug: filters.categorySlug ?? this.currentFilters.categorySlug,
                categoryId: filters.categoryId ?? this.currentFilters.categoryId,
                keyword: filters.keyword ?? this.currentFilters.keyword
            }

            try {
                const categoryStore = useCategoryStore()
                if (!categoryStore.loaded) {
                    await categoryStore.fetchCategories()
                }

                let categoryIds = []

                // 邏輯合併：優先判斷是否有明確的 ID，沒有再用 Slug 去找 ID
                let rootId = this.currentFilters.categoryId
                if (!rootId && this.currentFilters.categorySlug) {
                    rootId = categoryStore.getCategoryIdBySlug(this.currentFilters.categorySlug)
                }

                // 如果有找到對應的分類 ID，展開所有子分類
                if (rootId) {
                    categoryIds = categoryStore.getAllChildIds(rootId)
                } else if (this.currentFilters.categorySlug) {
                    // 如果給了 Slug 卻找不到分類，直接回傳空陣列
                    this.products = []
                    this.totalItems = 0
                    this.totalPages = 0
                    return
                }

                // 統一呼叫 Service
                const response = await productService.getFilteredProducts({
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    categoryIds: categoryIds,
                    keyword: this.currentFilters.keyword
                })

                this.products = response.data
                if (response.meta) {
                    this.totalItems = response.meta.total_count || 0
                    this.totalPages = response.meta.total_pages || 0
                }
            } catch (err) {
                this.error = 'Failed to load products'
                console.error(err)
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
    }
})
