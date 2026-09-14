import { ref } from 'vue'
import { event } from 'vue-gtag'

const CONSENT_KEY = 'gts_analytics_consent'

const read = () => {
    try {
        return localStorage.getItem(CONSENT_KEY)
    } catch {
        return null
    }
}

/**
 * 三態：`null`（還沒問過）/ `'granted'` / `'denied'`。
 *
 * ⚠️ 不可改用 vue-gtag 的 `useConsent().hasConsent`——它是看 `_ga` cookie 在不在，
 * 而 `rejectAll()` 會把那顆 cookie 刪掉，於是「拒絕過」和「還沒問過」變成同一種狀態，
 * 拒絕的人每次進站都會被重新詢問。見 `docs/adr/0005`。
 */
export const consent = ref(read())

export function setConsent(value) {
    try {
        localStorage.setItem(CONSENT_KEY, value)
    } catch {
        // 無痕模式寫不進去。記憶體狀態仍在，這次瀏覽期間行為正確
    }
    consent.value = value
}

/** Footer 的「Cookie 設定」用：回到未決狀態，banner 會再次出現 */
export function reopenConsent() {
    try {
        localStorage.removeItem(CONSENT_KEY)
    } catch {
        // 同 setConsent
    }
    consent.value = null
}

/**
 * 撤回同意時清掉 GA 種下的 cookie（`_ga`、`_ga_<id>`、`_gid`…）。
 *
 * ⚠️ 不可改用 vue-gtag 的 `useConsent()` 來拿這個行為：光是呼叫那個 composable，
 * 它結尾的 `if (hasConsent.value) addGtag()` 就會在使用者同意前載入 GA——而
 * `hasConsent` 是 `document.cookie.includes("_ga")` 這種子字串比對，本網域底下
 * 任何殘留的 `_ga*` 都會讓它誤判。見 `docs/adr/0005`。
 */
export function clearGaCookies() {
    const parts = location.hostname.split('.')
    const scopes = ['']
    for (let i = 0; i < parts.length - 1; i++) {
        scopes.push(`; domain=.${parts.slice(i).join('.')}`)
    }

    document.cookie.split(';').forEach((entry) => {
        const name = entry.split('=')[0].trim()
        if (!name.startsWith('_ga')) return
        // cookie 種在哪一層網域無法從 JS 讀出，只能每一層都試著讓它過期
        scopes.forEach((scope) => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`
        })
    })
}

// 未同意時不送。vue-gtag 的 query() 會自己建 dataLayer 再 push，不呼叫也不會壞，
// 但那些事件會一直堆在陣列裡沒人消化。
function track(name, params) {
    if (consent.value !== 'granted') return
    event(name, params)
}

// 一律不帶 price / value：這站送單時只有「參考小計」這個估算值，真正的金額是 Admin
// 事後在 Directus 確認的。帶進來會讓 GA 長出一個永遠對不上帳的營收數字。見 ADR 0005。
export function trackViewItem(product) {
    track('view_item', {
        items: [
            {
                item_id: String(product.id),
                item_name: product.name,
                item_category: product.category?.name,
            },
        ],
    })
}

export function trackAddToCart(product, variant, quantity) {
    track('add_to_cart', {
        items: [
            {
                item_id: variant.sku || String(variant.id),
                item_name: product.name,
                item_category: product.category?.name,
                quantity,
            },
        ],
    })
}

/**
 * 送出訂購單。GA4 的 `purchase` 語意對不上——那要求當場就有成交金額，
 * 而這裡價格還沒確認。`generate_lead` 才是詢價的推薦事件。
 */
export function trackGenerateLead({ itemCount, totalQuantity, quoteItemCount }) {
    track('generate_lead', {
        item_count: itemCount,
        total_quantity: totalQuantity,
        quote_item_count: quoteItemCount,
    })
}
