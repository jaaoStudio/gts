import { readItems, aggregate } from '@directus/sdk'
import directus, { getAssetUrl } from '../utils/directus'

// 1. 抽取共用欄位，未來五金行商品要加欄位只要改這裡
const LIST_FIELDS = [
    'id', 'name', 'slug', 'short_description', 'description', 'image',
    'category.name',
    // 分類已全面改用 M2M，列表也需帶出，並取 parent 以辨識子分類(葉節點)
    'categories.categories_id.id', 'categories.categories_id.name',
    'categories.categories_id.slug', 'categories.categories_id.parent',
    'tags.tags_id.name', 'tags.tags_id.color', 'variants.*'
];

// 詳情頁需要的額外完整欄位
const DETAIL_FIELDS = [
    ...LIST_FIELDS,
    'category.id', 'category.slug',
    'categories.categories_id.id', 'categories.categories_id.name', 'categories.categories_id.slug',
    'tags.tags_id.id',
    'variants.id', 'variants.spec_name', 'variants.price', 'variants.stock', 'variants.sku', 'variants.status', 'variants.variant_image',
    'gallery.directus_files_id'
];

// 2. 預設過濾條件：只顯示已上架的商品
const BASE_FILTER = {
    status: { _eq: 'published' }
};


/**
 * 產品服務 - 負責所有產品相關的 API 調用
 */
export const productService = {
    /**
     * 獲取產品（核心底層方法）
     */
    async getProducts({ page = 1, limit = 12, filter = {}, sort = '-date_created' } = {}) {
        const offset = (page - 1) * limit;

        // 將預設狀態過濾與傳入的過濾條件合併
        const combinedFilter = {
            _and: [BASE_FILTER, filter]
        };

        try {
            const [data, countResult] = await Promise.all([
                directus.request(readItems('products', {
                    filter: combinedFilter,
                    limit,
                    offset,
                    sort: [sort],
                    fields: LIST_FIELDS // 使用共用欄位
                })),
                directus.request(aggregate('products', {
                    aggregate: { count: '*' },
                    query: { filter: combinedFilter }
                }))
            ]);

            // 注意：Directus aggregate 回傳的是陣列，需安全轉型
            const totalCount = Number(countResult[0]?.count || 0);

            return {
                data: productMapper.mapProducts(data), // readItems 直接回傳 data 陣列
                meta: {
                    filter_count: totalCount,
                    total_count: totalCount,
                    total_pages: Math.ceil(totalCount / limit),
                    current_page: page
                }
            };
        } catch (err) {
            console.error('Failed to fetch products:', err);
            throw err;
        }
    },

    /**
     * 獲取精選產品
     */
    async getFeatured(limit = 4) {
        // 3. 直接複用 getProducts，不重寫 API 呼叫
        const response = await this.getProducts({
            limit,
            filter: {
                tags: { tags_id: { name: { _eq: '精選' } } }
            }
        });
        return response.data;
    },

    /**
     * 根據分類獲取產品
     */
    async getByCategory(categoryId, { page = 1, limit = 12 } = {}) {
        return await this.getProducts({
            page, limit,
            filter: { category: { _eq: categoryId } }
        });
    },

    /**
     * 搜尋產品
     */
    async search(keyword, { page = 1, limit = 12 } = {}) {
        if (!keyword) return await this.getProducts({ page, limit });

        return await this.getProducts({
            page, limit,
            filter: {
                _or: [
                    { name: { _contains: keyword } },
                    { short_description: { _contains: keyword } },
                    { description: { _contains: keyword } }
                ]
            }
        });
    },

    /**
     * 取每個分類最新幾張商品圖，供首頁分類卡做預覽拼貼。
     *
     * 刻意併發數個小查詢，而不是「一次撈一大包再前端分組」：後者要嘛撈太少
     * 讓冷門分類開天窗，要嘛為了保險撈上百筆、傳一堆用不到的資料。這裡分類
     * 數量由呼叫端固定（首頁只有 5 張卡），不是會無限膨脹的 N+1。
     *
     * 分類為 M2M 且每商品都掛 [父, 子]，故用父分類 id 直接就能撈到整個分支。
     *
     * @returns {Promise<Record<string, Array<{id,name,image}>>>} 以分類 id 為鍵
     */
    async getCategoryPreviews(categoryIds = [], limit = 3) {
        if (!categoryIds.length) return {}

        const results = await Promise.all(
            categoryIds.map((id) =>
                directus.request(readItems('products', {
                    filter: {
                        _and: [
                            BASE_FILTER,
                            { categories: { categories_id: { id: { _eq: id } } } },
                            { image: { _nnull: true } },   // 沒主圖的商品不進預覽，免得拼貼出現佔位圖
                        ]
                    },
                    fields: ['id', 'name', 'image'],
                    sort: ['-date_created'],
                    limit,
                })).catch((err) => {
                    // 單一分類撈失敗不該讓整區塊消失，該卡退回無圖樣式即可
                    console.error(`Failed to fetch previews for category ${id}:`, err)
                    return []
                })
            )
        )

        return categoryIds.reduce((acc, id, i) => {
            acc[id] = (results[i] || []).map((p) => ({
                id: p.id,
                name: p.name,
                image: getAssetUrl(p.image),
            }))
            return acc
        }, {})
    },

    /**
     * 獲取所有分類 (需確保分類也是發布狀態)
     */
    async getCategories() {
        // ⚠️ fields 動到時務必同步 Directus 的 Public / customer access 兩個 policy：
        // 這兩個 policy 的 categories read 是逐一列欄位而非 *，查一個沒開放的欄位
        // 會讓「整個請求」回 FORBIDDEN，導覽選單、首頁 bento、Footer 分類會一起空掉。
        const items = await directus.request(readItems('categories', {
            filter: { status: { _eq: 'published' } }, // 確保分類已發布
            fields: ['id', 'name', 'slug', 'parent', 'sort', 'preview_image'],
            sort: ['sort']
        }));

        return items.map((c) => ({
            ...c,
            preview_image: c.preview_image ? getAssetUrl(c.preview_image) : null,
        }));
    },

    /**
     * 根據 slug 獲取單一商品詳情
     */
    async getProductBySlug(slug) {
        // SDK 的 readItems 直接回傳陣列
        const items = await directus.request(readItems('products', {
            filter: {
                _and: [
                    BASE_FILTER,
                    { slug: { _eq: slug } }
                ]
            },
            fields: DETAIL_FIELDS, // 使用詳情專用欄位
            limit: 1
        }));

        // 4. 修正回傳結構的讀取方式
        return items.length > 0 ? productMapper.mapProduct(items[0]) : null;
    },

    buildFilter({ categoryIds = [], keyword = '' } = {}) {
        // ... (保持你原本的優秀邏輯) ...
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

    async getFilteredProducts({ page = 1, limit = 12, categoryIds = [], keyword = '', sort = '-date_created' } = {}) {
        const filter = this.buildFilter({ categoryIds, keyword })
        return await this.getProducts({ page, limit, filter, sort })
    }
}

/**
 * 產品資料轉換器
 */
export const productMapper = {
    /**
     * 將單一產品資料轉換
     */
    mapProduct(item) {
        // TODO(主標籤): 卡片小標目前取 tags[0]，而 tags 查詢未排序，
        // 顯示哪顆 Tag 取決於 Directus junction 順序、不可預測。
        // 若要「指定主標籤」，需在 tag 關聯加 sort 欄位或 is_primary 旗標再依此挑選。
        const firstTag = item.tags && item.tags.length > 0 && item.tags[0].tags_id
            ? item.tags[0].tags_id
            : null

        // 下架的規格不進前台：既不顯示在規格選擇器，也不參與最低價計算。
        // 用「排除 draft/archived」而非「只留 published」，避免 status 為空的舊資料被誤砍。
        // 注意：Directus 的 Public 與 customer access 兩個 policy 都已帶 status=published filter，
        // 訪客與註冊顧客本來就讀不到 draft；讀得到的只有 Administrator/AI_agent。
        // 故此處為預防性質：(1) 自家 admin 帳號登入前台時，所見與客人一致；
        // (2) 不再隱性依賴「policy 剛好有設 filter」，日後權限被改動也不會外洩下架規格。
        const variants = (item.variants || [])
            .filter(v => v.status !== 'draft' && v.status !== 'archived')
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

        // 攤平商品標籤（junction → tag 物件），供詳情頁顯示多標籤。
        // 卡片用的主標籤仍走 badge/badgeColor（見上方 firstTag）。
        const tags = (item.tags || [])
            .map(t => t.tags_id)
            .filter(t => t !== null && t !== undefined)

        // 處理分類：優先使用主分類 (M2O)，如果沒有則使用多對多關聯的第一個分類
        const m2mCategories = (item.categories || [])
            .map(c => c.categories_id)
            .filter(c => c !== null)

        // 主分類優先取「子分類」(有 parent 的葉節點)，讓卡片/標籤顯示最精確的分類；
        // 其次退回 M2O，再退回第一個 M2M 分類
        const leafCategory = m2mCategories.find(c => c && c.parent)
        const primaryCategory = leafCategory || item.category || (m2mCategories.length > 0 ? m2mCategories[0] : null)

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
            categories: m2mCategories,
            badge: firstTag ? firstTag.name : null,
            badgeColor: firstTag ? firstTag.color : null,
            tags: tags,
            variants: variants
        }
    },

    /**
     * 將多個產品資料轉換
     */
    mapProducts(items) {
        if (!Array.isArray(items)) {
            console.error('mapProducts expected an array but got:', items);
            return [];
        }
        return items.map(item => this.mapProduct(item))
    }
}
