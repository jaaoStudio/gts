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
                data,
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
        return await directus.request(readItems('products', {
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

        const publishedVariants = item.variants || []
        const variantPrices = publishedVariants
            .map(v => v.price)
            .filter(p => p !== null && p !== undefined)

        const displayPrice = variantPrices.length > 0
            ? Math.min(...variantPrices)
            : 0

        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            short_description: item.short_description,
            description: item.description,
            price: displayPrice,
            image: getAssetUrl(item.image),
            badge: firstTag ? firstTag.name : null,
            badgeColor: firstTag ? firstTag.color : null,
            variants: publishedVariants
        }
    },

    /**
     * 將多個產品資料轉換
     */
    mapProducts(items) {
        return items.map(item => this.mapProduct(item))
    }
}
