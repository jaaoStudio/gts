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
 * 確認後小計：`Σ 確認單價 × 數量`，應付金額的基底。
 *
 * 衍生值，不儲存於資料庫。與 `orders.subtotal`（參考小計，送出當下的舊價快照）
 * 是兩回事——後者不參與應付金額的計算。
 *
 * 尚未報價的詢價品項沒有價格可加，跳過而不是當成 0。
 */
export const confirmedSubtotal = (items = []) =>
    items.reduce((sum, it) => {
        const price = effectivePrice(it)
        return price == null ? sum : sum + price * it.quantity
    }, 0)
