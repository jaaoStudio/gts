import { readItems, aggregate } from '@directus/sdk'
import directus, { getAssetUrl } from '../utils/directus'

/**
 * 產品服務 - 負責所有產品相關的 API 調用
 */
export const productService = {
    /**
     * 獲取產品（支援分頁）
     * @param {Object} options - 查詢選項
     * @param {number} options.page - 頁碼（從 1 開始）
     * @param {number} options.limit - 每頁數量
     * @param {Object} options.filter - 過濾條件
     * @param {string} options.sort - 排序欄位
     */
    async getProducts({ page = 1, limit = 12, filter = {}, sort = '-date_created' } = {}) {
        const offset = (page - 1) * limit

        try {
            // 同時查詢資料和總數
            const [data, countResult] = await Promise.all([
                directus.request(readItems('products', {
                    filter,
                    limit,
                    offset,
                    sort: [sort],
                    fields: [
                        'id',
                        'name',
                        'slug',
                        'short_description',
                        'description',
                        'image',
                        'category.name',
                        'tags.tags_id.name',
                        'tags.tags_id.color',
                        'variants.*'
                    ]
                })),
                directus.request(
                    aggregate('products', {
                        aggregate: { count: '*' },
                        query: { filter }
                    })
                )
            ])

            return {
                data: productMapper.mapProducts(data),
                meta: {
                    filter_count: countResult[0].count,
                    total_count: countResult[0].count,
                    total_pages: Math.ceil(countResult[0].count / limit),
                    current_page: page
                }
            }
        } catch (err) {
            console.error('Failed to fetch products:', err)
            throw err
        }
    },
    /**
     * 獲取精選產品（不需要分頁，數量固定）
     */
    async getFeatured(limit = 4) {
        const data = await directus.request(readItems('products', {
            filter: {
                tags: {
                    tags_id: {
                        name: { _eq: '精選' }
                    }
                }
            },
            limit,
            fields: [
                'id',
                'name',
                'slug',
                'short_description',
                'description',
                'image',
                'category.name',
                'tags.tags_id.name',
                'tags.tags_id.color',
                'variants.*'
            ]
        }))
        return productMapper.mapProducts(data)
    },

    /**
     * 根據分類獲取產品（支援分頁）
     */
    async getByCategory(categoryId, { page = 1, limit = 12 } = {}) {
        return await this.getProducts({
            page,
            limit,
            filter: {
                category: { _eq: categoryId }
            }
        })
    },

    /**
     * 搜尋產品
     */
    async search(keyword, { page = 1, limit = 12 } = {}) {
        return await this.getProducts({
            page,
            limit,
            filter: {
                _or: [
                    { name: { _contains: keyword } },
                    { short_description: { _contains: keyword } },
                    { description: { _contains: keyword } }
                ]
            }
        })
    },

    /**
     * 獲取所有分類
     */
    async getCategories() {
        return await directus.request(readItems('categories', {
            fields: ['id', 'name', 'slug', 'parent'],
            sort: ['sort']
        }))
    },

    /**
     * 根據 slug 獲取單一商品詳情
     */
    async getProductBySlug(slug) {
        const response = await directus.request(readItems('products', {
            filter: {
                slug: { _eq: slug }
            },
            fields: [
                'id',
                'name',
                'slug',
                'short_description',
                'description',
                'image',
                'category.id',
                'category.name',
                'category.slug',
                'categories.categories_id.id',
                'categories.categories_id.name',
                'categories.categories_id.slug',
                'tags.tags_id.id',
                'tags.tags_id.name',
                'tags.tags_id.color',
                'variants.id',
                'variants.spec_name',
                'variants.price',
                'variants.stock',
                'variants.sku',
                'variants.status',
                'variants.variant_image',
                'gallery.directus_files_id'
            ],
            limit: 1
        }))

        return response.length > 0 ? productMapper.mapProduct(response[0]) : null
    },

    /**
     * 建構篩選條件
     * @param {Object} options
     * @param {Array<string>} options.categoryIds - 分類 ID 列表
     * @param {string} options.keyword - 搜尋關鍵字
     * @returns {Object} Directus filter object
     */
    buildFilter({ categoryIds = [], keyword = '' } = {}) {
        const filters = []

        if (categoryIds && categoryIds.length > 0) {
            filters.push({
                categories: {
                    categories_id: {
                        id: { _in: categoryIds }
                    }
                }
            })
        }

        if (keyword) {
            filters.push({
                _or: [
                    { name: { _contains: keyword } },
                    { short_description: { _contains: keyword } },
                    { description: { _contains: keyword } }
                ]
            })
        }

        if (filters.length === 0) return {}
        if (filters.length === 1) return filters[0]
        return { _and: filters }
    },

    /**
     * 統一篩選產品（支援多重分類、關鍵字、分頁）
     * @param {Object} options - 查詢選項
     * @param {number} options.page - 頁碼
     * @param {number} options.limit - 每頁數量
     * @param {Array<string>} options.categoryIds - 分類 ID 列表
     * @param {string} options.keyword - 搜尋關鍵字
     * @param {string} options.sort - 排序欄位
     */
    async getFilteredProducts({ page = 1, limit = 12, categoryIds = [], keyword = '', sort = '-date_created' } = {}) {
        const filter = this.buildFilter({ categoryIds, keyword })
        return await this.getProducts({ page, limit, filter, sort })
    }
}

/**
 * 產品資料轉換器 - 將 API 回傳的資料轉換成前端需要的格式
 */
export const productMapper = {
    /**
     * 將單一產品資料轉換
     */
    mapProduct(item) {
        const firstTag = item.tags && item.tags.length > 0 && item.tags[0].tags_id
            ? item.tags[0].tags_id
            : null

        const variants = (item.variants || [])
            .map(v => ({
                ...v,
                image: v.variant_image ? getAssetUrl(v.variant_image) : null
            }))

        const variantPrices = variants
            .map(v => v.price)
            .filter(p => p !== null && p !== undefined)

        const displayPrice = variantPrices.length > 0
            ? Math.min(...variantPrices)
            : 0

        // 處理相簿圖片
        let gallery = []
        if (item.gallery && Array.isArray(item.gallery)) {
            gallery = item.gallery
                .filter(g => g && g.directus_files_id)
                .map(g => getAssetUrl(g.directus_files_id))
        }

        const mainImage = item.image ? getAssetUrl(item.image) : null

        // 處理分類：優先使用主分類 (M2O)，如果沒有則使用多對多關聯的第一個分類
        const m2mCategories = (item.categories || [])
            .map(c => c.categories_id)
            .filter(c => c !== null)

        const primaryCategory = item.category || (m2mCategories.length > 0 ? m2mCategories[0] : null)

        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            short_description: item.short_description,
            description: item.description,
            price: displayPrice,
            image: mainImage,
            gallery: gallery,
            category: primaryCategory,
            categories: m2mCategories, // 額外回傳完整分類列表備用
            badge: firstTag ? firstTag.name : null,
            badgeColor: firstTag ? firstTag.color : null,
            variants: variants
        }
    },

    /**
     * 將多個產品資料轉換
     */
    mapProducts(items) {
        return items.map(item => this.mapProduct(item))
    }
}
