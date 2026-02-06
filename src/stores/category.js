import { defineStore } from 'pinia'
import { productService } from '../services/productService'

export const useCategoryStore = defineStore('category', {
    state: () => ({
        categories: [],
        loading: false,
        loaded: false,
        error: null,
    }),

    getters: {
        /**
         * 根據 slug 查找分類名稱
         */
        getCategoryNameBySlug: (state) => (slug) => {
            const found = state.categories.find(c => c.slug === slug)
            return found ? found.name : slug
        },

        /**
         * 根據 slug 查找分類 ID
         */
        getCategoryIdBySlug: (state) => (slug) => {
            const found = state.categories.find(c => c.slug === slug)
            return found ? found.id : null
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
        getCategoryBreadcrumb: (state) => (slug) => {
            const path = []
            let current = state.categories.find(c => c.slug === slug)

            while (current) {
                path.unshift(current)
                if (current.parent) {
                    current = state.categories.find(c => c.id === current.parent)
                } else {
                    current = null
                }
            }
            return path
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
         * 強制重新載入分類（用於後台更新後刷新）
         */
        async refreshCategories() {
            this.loaded = false
            return await this.fetchCategories()
        },
    },
})
