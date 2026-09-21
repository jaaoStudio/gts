// router 的 scrollBehavior 與非同步載入資料的頁面之間的握手。
// 事件名只在這裡出現一次：兩邊各寫一份時，打錯字會靜默退化成等滿逾時，測試不會紅。
const EVENT = 'app:content-ready'

// 保險絲：只在「該頁根本沒發訊號」時兜底，**不可以短到跟訊號賽跑**。
// ⚠️ 這裡曾經是 600ms，而商品列表的 fetch 要 500～1000ms，結果保險絲幾乎每次都先燒，
// 捲動在骨架還在時就被還原、夾到骨架的高度（實測 1400 被夾成 1062），而且 fetch 快的
// 時候又會正常——看起來像隨機失敗。調大只影響「真的沒發訊號」那條路徑的延遲。
const TIMEOUT_MS = 3000

export const signalContentReady = () => window.dispatchEvent(new Event(EVENT))

export const waitForContent = () => new Promise((resolve) => {
    const done = () => {
        clearTimeout(timer)
        window.removeEventListener(EVENT, done)
        resolve()
    }
    const timer = setTimeout(done, TIMEOUT_MS)
    window.addEventListener(EVENT, done, { once: true })
})
