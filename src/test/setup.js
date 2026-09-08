import { beforeEach, vi } from 'vitest'

/**
 * 測試環境是 node，沒有 localStorage。order store 的 _persist() 會用到它。
 *
 * 補一個記憶體版而不是改用 jsdom：這裡要測的是算錢與失敗路徑的邏輯，
 * 拉進整個 DOM 實作只為了一個 key-value 儲存並不划算。
 */
class MemoryStorage {
    #data = new Map()

    getItem(key) {
        return this.#data.has(key) ? this.#data.get(key) : null
    }

    setItem(key, value) {
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
    globalThis.localStorage.clear()
    // store 的失敗路徑會 console.error，那是刻意的行為，不需要噴進測試輸出
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
