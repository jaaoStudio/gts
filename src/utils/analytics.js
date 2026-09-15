import { useConsentStore } from '../stores/consent'

/** 沒設 `VITE_GA_ID` 就完全不載入 GA，banner 也沒有存在意義（本機 dev 即是此狀態）*/
export const analyticsConfigured = !!import.meta.env.VITE_GA_ID

export const isExcludedFromAnalytics = (route) =>
    route.matched.some((r) => r.meta?.noAnalytics)

export const routeToPageView = (route) => ({
    // 讀 meta 而非 document.title：後者要等 router 的 afterEach 先跑完才正確，
    // 而那只是註冊順序的巧合。每個可導航的路由都必須有 meta.title（有測試守著）。
    page_title: route.meta?.title,
    // ⚠️ 要用實際路徑，換成 route.matched 的 pattern 會讓所有商品併成一列
    page_path: route.path,
    page_location: window.location.href,
})

export const gtagOptions = (router) => ({
    tagId: import.meta.env.VITE_GA_ID,
    // 同意前不載入 script；不能改用預設的 auto。
    initMode: 'manual',
    pageTracker: {
        router,
        exclude: isExcludedFromAnalytics,
        template: routeToPageView,
    },
})

// mount 後再排程，避免 GA 請求搶首次繪製；callback 內重查同意，避免撤回後又啟用。
export const startAnalyticsWhenIdle = (consentStore) => {
    ;(window.requestIdleCallback ?? setTimeout)(() => {
        if (consentStore.value === 'granted') consentStore.enable()
    })
}

// ⚠️ 事件一律不帶 price / value / currency——這站沒有真實成交價，理由見 ADR 0005
export function trackViewItem(product) {
    useConsentStore().track('view_item', {
        items: [
            {
                item_id: String(product.id),
                item_name: product.name,
                item_category: product.category?.name,
            },
        ],
    })
}

export function trackAddToCart(product, quantity, specName) {
    useConsentStore().track('add_to_cart', {
        items: [
            {
                // ⚠️ 必須與 trackViewItem 同一把 key，否則 GA4 會把瀏覽與加入拆成兩列
                item_id: String(product.id),
                item_name: product.name,
                item_category: product.category?.name,
                item_variant: specName || undefined,
                quantity,
            },
        ],
    })
}

/** 送出訂購單。用 `generate_lead` 而非 `purchase`，理由見 ADR 0005 */
export function trackGenerateLead({ itemCount, totalQuantity, quoteItemCount }) {
    useConsentStore().track('generate_lead', {
        item_count: itemCount,
        total_quantity: totalQuantity,
        quote_item_count: quoteItemCount,
    })
}
