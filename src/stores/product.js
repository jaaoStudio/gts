import { defineStore } from 'pinia'
import { readItems } from '@directus/sdk'
import directus, { getAssetUrl } from '../utils/directus'

export const useProductStore = defineStore('product', {
    state: () => ({
        products: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchProducts() {
            this.loading = true
            this.error = null
            try {
                const response = await directus.request(readItems('products', {
                    fields: [
                        'id',
                        'name',
                        'short_description',
                        'description',
                        'price',
                        'image',
                        'category.name',
                        'tags.tags_id.name',
                        'tags.tags_id.color'
                    ]
                }))

                this.products = response.map(item => {
                    // Handle Many-to-Many tags structure (item.tags is an array of junction objects)
                    const firstTag = item.tags && item.tags.length > 0 && item.tags[0].tags_id
                        ? item.tags[0].tags_id
                        : null

                    return {
                        id: item.id,
                        name: item.name,
                        short_description: item.short_description,
                        description: item.description,
                        price: item.price,
                        image: getAssetUrl(item.image),
                        badge: firstTag ? firstTag.name : null,
                        badgeColor: firstTag ? firstTag.color : null
                    }
                })
            } catch (err) {
                this.error = 'Failed to load products'
                console.error(err)
            } finally {
                this.loading = false
            }
        }
    }
})
