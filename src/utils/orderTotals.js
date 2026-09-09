/**
 * 訂購單金額計算。
 *
 * 抽成純函式的理由是「逐行金額加起來必須等於小計」這個保證——它只有在
 * 兩邊共用同一套取價規則時才成立。留在元件裡各寫一份，改動時很容易只改到
 * 一邊，而金額對不上正是客人唯一會逐項核對的東西。
 */

/**
 * 這一行實際採用的單價。
 *
 * 老闆確認過的價優先，未確認則沿用客人下單時看到的單價。
 * 回傳 `null` 只有一個意思：詢價品項且尚未報價，這一行沒有金額可算。
 *
 * ⚠️ 用 `??` 而不是 `||`：確認價可以是 `0`（老闆送的、或首購禮），
 * `||` 會把 0 當假值而錯誤地退回原價。
 */
export const effectivePrice = (item) => item.confirmed_price ?? item.unit_price ?? null

/**
 * 這一行的金額：`單價 × 數量`。明細頁每一列顯示的就是這個數字。
 *
 * 回傳 `null` 的意義與 effectivePrice 相同：詢價品項尚未報價，這一行算不出金額。
 *
 * 存在的理由是 confirmedSubtotal 底下就是它的加總——「逐行加起來等於小計」因此
 * 是結構上成立的，而不是元件與 util 各寫一份剛好算出同一個數。
 */
export const lineTotal = (item) => {
    const price = effectivePrice(item)
    return price == null ? null : price * item.quantity
}

/**
 * 確認後小計：`Σ lineTotal`，應付金額的基底。
 *
 * 衍生值，不儲存於資料庫。與 `orders.subtotal`（參考小計，送出當下的舊價快照）
 * 是兩回事——後者不參與應付金額的計算。
 *
 * 尚未報價的詢價品項沒有價格可加，跳過而不是當成 0。
 */
// ⚠️ 用 `items ?? []` 而不是預設參數 `(items = [])`：預設參數只對 `undefined` 生效，
// Directus 若把空關聯回成 `items: null`，預設值不會啟動而是直接對 null 呼叫 reduce。
// 呼叫端是 `order.value?.items` 透傳，兩種值都可能進來。
export const confirmedSubtotal = (items) =>
    (items ?? []).reduce((sum, it) => {
        const total = lineTotal(it)
        return total == null ? sum : sum + total
    }, 0)

/**
 * 預估運費的結果。狀態明確分開，呼叫端不必自己從數字反推該顯示什麼。
 *
 * - `unavailable` — Directus 的運費設定不完整，運費列整行不渲染（退回加運費之前的行為）
 * - `free` — 已達免運門檻
 * - `quote` — 含詢價品項且尚未達門檻，算不出可信的數字
 * - `charged` — 收費，附 `amount` 與距離免運還差多少的 `gap`
 */
export const SHIPPING = {
    unavailable: 'unavailable',
    free: 'free',
    quote: 'quote',
    charged: 'charged',
}

/**
 * 訂購單頁顯示給客人看的**預估**運費。
 *
 * 這是預估而不是實價：老闆會逐單看內容物決定要幾箱，再填 `orders.shipping_fee`，
 * 那個值才進入應付金額。前台沒有重量與材積資料，算不出箱數（`product_variants`
 * 沒有這些欄位），所以一律以一箱計。
 *
 * @param {object}      p
 * @param {number}      p.subtotal       只含標價品項的小計
 * @param {boolean}     p.hasQuoteItems  是否含尚未報價的詢價品項
 * @param {number|null} p.fee            Directus 的 default_shipping_fee
 * @param {number|null} p.threshold      Directus 的 free_shipping_threshold
 */
export const estimateShipping = ({ subtotal, hasQuoteItems, fee, threshold }) => {
    // 設定缺一不可。寧可整行不顯示，也不要拿寫死的預設值假裝——那會讓「後台把值
    // 清空」看起來像正常運作，設定頁因此變成騙人的。與 settings 的 bankInfo 同慣例。
    if (fee == null || threshold == null) return { state: SHIPPING.unavailable }

    // 門檻判斷放在詢價判斷之前：標價部分自己就已達門檻時，再加上詢價品項只會更多，
    // 免運是確定的，沒有不敢講的理由。
    if (subtotal >= threshold) return { state: SHIPPING.free }

    // 反過來，未達門檻又有詢價品項時，小計不是這張單的實際金額，拿它去判定免運
    // 會給出一個報價後就被推翻的數字。這與 hasQuoteItems 存在的理由是同一件事。
    if (hasQuoteItems) return { state: SHIPPING.quote }

    return { state: SHIPPING.charged, amount: fee, gap: threshold - subtotal }
}
