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
 * - `charged` — 收費，附 `amount`；宅配另附距離免運還差多少的 `gap`，超商則改附
 *   說明該級距怎麼來的 `note`（它沒有免運可湊，給 gap 會是騙人的）
 */
export const SHIPPING = {
    unavailable: 'unavailable',
    free: 'free',
    quote: 'quote',
    charged: 'charged',
}

/**
 * 自己拿去 7-11 門市寄交貨便的公告費率與限制。
 *
 * ⚠️ 名字帶 `IBON` 是刻意的：這組數字**整組綁在寄件管道上**，改走綠界要換掉整個
 * 常數而不是調個別欄位。說明頁的數字也一律從這裡讀，不在文案裡重打。
 * 來源 https://www.7-11.com.tw/service/accept.aspx（2026-09-16）· why: `docs/adr/0006`
 */
export const CVS_IBON = {
    // 依代收金額分階
    tiers: [
        { max: 1000, fee: 60 },
        { max: 2000, fee: 70 },
        { max: 3000, fee: 80 },
        { max: 4000, fee: 90 },
        { max: 5000, fee: 100 },
    ],
    maxCollectable: 5000,
    holdDays: 7,
    size: { longestCm: 45, totalCm: 105, weightKg: 10 },
}

const tierFee = (amount) => (CVS_IBON.tiers.find((t) => amount <= t.max) ?? CVS_IBON.tiers.at(-1)).fee

/**
 * 交貨便運費。
 *
 * ⚠️ 級距查的是**含運的代收金額**，不是小計，所以要查兩次——外層那次不可省。
 * 兩次就夠：加運費最多跳一階（階寬 1,000 遠大於最高運費 100）。
 */
export const cvsShippingFee = (subtotal) => tierFee(subtotal + tierFee(subtotal))

/** 不能走超商取貨付款的原因。`null` 代表可以。 */
export const CVS_BLOCK = {
    oversize: 'oversize',
    overLimit: 'over_limit',
}

/**
 * 這張訂購單能不能走超商取貨付款。
 *
 * 只擋確定的兩件事，其餘交給老闆逐單判斷（why: `docs/adr/0006` 第 4、5 條）。
 *
 * @param {object}  p
 * @param {number}  p.subtotal            只含標價品項的小計
 * @param {boolean} p.allItemsShippable   是否每一項都勾了「可超商寄送」
 */
export const cvsBlockReason = ({ subtotal, allItemsShippable }) => {
    if (!allItemsShippable) return CVS_BLOCK.oversize

    // ⚠️ 比的是含運的代收金額，不是小計——運費算在上限裡面。
    if (subtotal + cvsShippingFee(subtotal) > CVS_IBON.maxCollectable) return CVS_BLOCK.overLimit

    return null
}

/**
 * 訂購單頁顯示給客人看的**預估**運費。
 *
 * 這是預估而不是實價：老闆會逐單看內容物決定要幾箱，再填 `orders.shipping_fee`，
 * 那個值才進入應付金額。前台沒有重量與材積資料，算不出箱數（`product_variants`
 * 沒有這些欄位），所以宅配一律以一箱計。
 *
 * 兩種交貨方式走同一個出口是刻意的：呼叫端只有一個 computed、畫面只有一個區塊，
 * 加第三種方式時也不必再長出一條 `v-else-if`。
 *
 * @param {object}      p
 * @param {boolean}     p.isCvs          是否走超商取貨付款（不傳＝宅配，維持原行為）
 * @param {number}      p.subtotal       只含標價品項的小計
 * @param {boolean}     p.hasQuoteItems  是否含尚未報價的詢價品項
 * @param {{fee: number, threshold: number}|null} p.rule
 *        宅配的運費規則，來自 settings store 的 shippingRule。**設定是否完整由那個
 *        getter 單獨認定**，這裡不重複判斷 null 欄位——兩邊各判一次，規則遲早會分歧。
 */
export const estimateShipping = ({ isCvs, subtotal, hasQuoteItems, rule }) => {
    // 超商不吃 site_settings，也**不適用免運門檻**（why: `docs/adr/0006` 第 1 條）
    if (isCvs) {
        // ⚠️ 與 cvsBlockReason 刻意不同調，不要順手統一：那邊問「會不會超過上限」，
        // 詢價只會更超標所以敢判；這邊問「收多少」，詢價讓答案未定所以不敢講。
        if (hasQuoteItems) return { state: SHIPPING.quote }

        return {
            state: SHIPPING.charged,
            amount: cvsShippingFee(subtotal),
            note: '7-11 交貨便依代收金額分級，超商取貨不適用免運門檻。',
        }
    }

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
