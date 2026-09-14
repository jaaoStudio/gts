import { beforeEach, vi } from 'vitest'

/**
 * 測試環境是 node，沒有 localStorage（order store 的 _persist() 會用到）。
 *
 * 刻意只實作 Storage 介面，不加測試專用的控制開關——要讓寫入失敗就在該測試裡
 * 用 `vi.spyOn(localStorage, 'setItem').mockImplementationOnce(...)`。
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

    // cookie 與 localStorage 同屬「每個測試都該重置的 ambient 狀態」。只有 jsdom 有
    // document——node 環境的測試不需要，也沒有。
    if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((entry) => {
            const name = entry.split('=')[0].trim()
            if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        })
    }

    // store 的失敗路徑會 console.error，那是刻意的行為，不需要噴進測試輸出
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
