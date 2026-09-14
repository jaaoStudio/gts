import { ref } from 'vue'
import { addGtag, event, optIn, optOut } from 'vue-gtag'

const CONSENT_KEY = 'gts_analytics_consent'

/** 沒設 `VITE_GA_ID` 就完全不載入 GA，banner 也沒有存在意義（本機 dev 即是此狀態）*/
export const analyticsConfigured = !!import.meta.env.VITE_GA_ID

const persist = (value) => {
    try {
        if (value == null) localStorage.removeItem(CONSENT_KEY)
        else localStorage.setItem(CONSENT_KEY, value)
    } catch {
        // 無痕模式寫不進去。同意不重載頁面，所以記憶體狀態撐得過這次瀏覽
    }
}

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
 * ⚠️ 不可改用 vue-gtag 的 `useConsent()`：它靠 `_ga` cookie 判斷，分不出「拒絕過」
 * 與「還沒問過」，而且光是呼叫就會載入 GA。見 `docs/adr/0005`。
 */
export const consent = ref(read())

/** 狀態與副作用必須一起發生——分開寫的那版漏掉了撤回，GA 照跑 */
export function setConsent(value) {
    persist(value)
    consent.value = value

    if (value === 'granted') enableAnalytics()
    else if (value === 'denied') disableAnalytics()
}

/** Footer 的「Cookie 設定」：回到未決狀態，banner 會再次出現 */
export const reopenConsent = () => setConsent(null)

let started = false

/** ⚠️ `started` 不可拿掉：`addGtag()` 每呼叫一次就多註冊一組 `afterEach`（ADR 0005）*/
export async function enableAnalytics() {
    optIn()
    if (started) return
    started = true
    await addGtag()
}

/** ⚠️ 只清 cookie 不夠：pageTracker 的 `afterEach` 不經過下面的 `track()`（ADR 0005）*/
export function disableAnalytics() {
    optOut()
    clearGaCookies()
}

/** 清掉 GA 種下的 cookie（`_ga`、`_ga_<id>`、`_gid`…）*/
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

function track(name, params) {
    if (consent.value !== 'granted') return
    event(name, params)
}

// ⚠️ 事件一律不帶 price / value / currency——這站沒有真實成交價，理由見 ADR 0005
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

export function trackAddToCart(product, quantity, specName) {
    track('add_to_cart', {
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
    track('generate_lead', {
        item_count: itemCount,
        total_quantity: totalQuantity,
        quote_item_count: quoteItemCount,
    })
}
