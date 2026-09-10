import { beforeEach, vi } from 'vitest'

/**
 * 測試環境是 node，沒有 localStorage。order store 的 _persist() 會用到它。
 *
 * 補一個記憶體版而不是改用 jsdom：這裡要測的是算錢與失敗路徑的邏輯，
 * 拉進整個 DOM 實作只為了一個 key-value 儲存並不划算。
 *
 * 這個 fake 刻意只實作 Storage 的介面，不帶任何測試專用的控制開關。
 * 要讓寫入失敗（測 _persist() 的無痕模式／配額滿分支）就在該測試裡用 vitest
 * 現成的機制：`vi.spyOn(localStorage, 'setItem').mockImplementationOnce(...)`。
 * 先前這裡有一個 failNextSetItem() 的黏性旗標，結果為了防它滲進下一個測試又得
 * 在 beforeEach 補一層重建——一個特例長出第二個特例來收拾自己。
 */
class MemoryStorage {
    #data = new Map()

    getItem(key) {
        return this.#data.get(key) ?? null
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

/**
 * 用 defineProperty 而不是直接指派：元件測試跑在 jsdom（見 OrderDetail.test.js
 * 的 docblock），那裡的 window.localStorage 是唯讀 getter，直接指派會拋
 * 「Cannot set property localStorage of [object Window] which has only a getter」。
 */
const installMemoryStorage = () => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: new MemoryStorage(),
        writable: true,
        configurable: true,
    })
}

installMemoryStorage()

beforeEach(() => {
    // 換一個全新的實例而不是 clear()：順帶把上一個測試掛在它身上的 spy 一起丟掉
    installMemoryStorage()
    // store 的失敗路徑會 console.error，那是刻意的行為，不需要噴進測試輸出
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
