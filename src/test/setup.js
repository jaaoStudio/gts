import { beforeEach, vi } from 'vitest'

/**
 * 測試環境是 node，沒有 localStorage。order store 的 _persist() 會用到它。
 *
 * 補一個記憶體版而不是改用 jsdom：這裡要測的是算錢與失敗路徑的邏輯，
 * 拉進整個 DOM 實作只為了一個 key-value 儲存並不划算。
 */
class MemoryStorage {
    #data = new Map()
    #failNextSet = false

    /**
     * 讓下一次 setItem 拋錯一次。
     *
     * 沒有這個開關，`_persist()` 的 catch（無痕模式／配額滿）在測試裡永遠走不到——
     * Map.set 不會失敗，所以那條路徑等於沒被覆蓋。真實瀏覽器丟的是
     * QuotaExceededError，這裡照樣命名，讓失敗長得像它實際的樣子。
     */
    failNextSetItem() {
        this.#failNextSet = true
    }

    getItem(key) {
        return this.#data.has(key) ? this.#data.get(key) : null
    }

    setItem(key, value) {
        if (this.#failNextSet) {
            this.#failNextSet = false
            const err = new Error('無法寫入：儲存空間已滿或處於無痕模式')
            err.name = 'QuotaExceededError'
            throw err
        }
        this.#data.set(key, String(value))
    }

    removeItem(key) {
        this.#data.delete(key)
    }

    clear() {
        this.#data.clear()
    }
}

globalThis.localStorage = new MemoryStorage()

beforeEach(() => {
    // 換一個全新的實例而不是 clear()：後者不會重設 failNextSetItem 的旗標，
    // 一個測試設了卻沒用到就會滲進下一個測試
    globalThis.localStorage = new MemoryStorage()
    // store 的失敗路徑會 console.error，那是刻意的行為，不需要噴進測試輸出
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
