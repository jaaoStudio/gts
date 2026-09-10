/**
 * 訂購單金額計算。純函式，明細頁與小計共用同一套取價規則——「逐行加起來等於
 * 小計」因此是結構上成立的，而不是兩邊各寫一份剛好算出同一個數。
 *
 * 三個函式回傳 `null` 都是同一個意思：詢價品項尚未報價，這一行沒有金額可算。
 */

// ⚠️ `??` 不可換成 `||`：確認價可以是 0（老闆送的），`||` 會把它當假值退回原價。
export const effectivePrice = (item) => item.confirmed_price ?? item.unit_price ?? null

// 明細頁每一列顯示的數字。confirmedSubtotal 就是它的加總。
export const lineTotal = (item) => {
    const price = effectivePrice(item)
    return price == null ? null : price * item.quantity
}

// 確認後小計，應付金額的基底。衍生值，與 orders.subtotal（送出當下的舊價快照）無關。
//
// ⚠️ `items ?? []` 不可換成預設參數 `(items = [])`：後者只對 undefined 生效，
// 而 Directus 的空關聯可能回 null，呼叫端是 `order.value?.items` 直接透傳。
export const confirmedSubtotal = (items) =>
    (items ?? []).reduce((sum, it) => sum + (lineTotal(it) ?? 0), 0)

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
 * @param {{fee: number, threshold: number}|null} p.rule
 *        運費規則，來自 settings store 的 shippingRule。**設定是否完整由那個 getter
 *        單獨認定**，這裡不重複判斷 null 欄位——兩邊各判一次，規則遲早會分歧。
 */
export const estimateShipping = ({ subtotal, hasQuoteItems, rule }) => {
    // 設定不完整。寧可整行不顯示，也不要拿寫死的預設值假裝——那會讓「後台把值
    // 清空」看起來像正常運作，設定頁因此變成騙人的。與 settings 的 bankInfo 同慣例。
    if (!rule) return { state: SHIPPING.unavailable }

    const { fee, threshold } = rule

    // 門檻判斷放在詢價判斷之前：標價部分自己就已達門檻時，再加上詢價品項只會更多，
    // 免運是確定的，沒有不敢講的理由。
    if (subtotal >= threshold) return { state: SHIPPING.free }

    // 反過來，未達門檻又有詢價品項時，小計不是這張單的實際金額，拿它去判定免運
    // 會給出一個報價後就被推翻的數字。這與 hasQuoteItems 存在的理由是同一件事。
    if (hasQuoteItems) return { state: SHIPPING.quote }

    return { state: SHIPPING.charged, amount: fee, gap: threshold - subtotal }
}
