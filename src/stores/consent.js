import { defineStore } from 'pinia'
import { addGtag, event, optIn, optOut } from 'vue-gtag'

const STORAGE_KEY = 'gts_analytics_consent'

export const useConsentStore = defineStore('consent', {
    state: () => ({
        /**
         * 三態：`null`（還沒問過）/ `'granted'` / `'denied'`。
         *
         * ⚠️ 不可改用 vue-gtag 的 `useConsent()`：它靠 `_ga` cookie 判斷，分不出
         * 「拒絕過」與「還沒問過」，而且光是呼叫就會載入 GA。見 `docs/adr/0005`。
         */
        value: null,
        /** ⚠️ 不可拿掉：`addGtag()` 每呼叫一次就多註冊一組 `router.afterEach` */
        started: false,
        /** 啟動前送出的事件。直接送會排在 `config` 前面，被 gtag 靜默丟棄 */
        queued: [],
    }),

    getters: {
        isUndecided: (state) => state.value === null,
    },

    actions: {
        /** 在 `main.js` 呼叫一次（同 order store）：banner 顯不顯示要在首次繪製就定案 */
        init() {
            this.value = this._read()

            // 其他分頁改了選擇就同步過來，否則在 A 分頁撤回、B 分頁照樣追蹤。
            // storage 事件只在「其他」分頁觸發，不會自迴圈。
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) this._apply(e.newValue)
            })
        },

        set(value) {
            this._persist(value)
            this._apply(value)
        },

        /** Footer 的「Cookie 設定」：回到未決狀態，banner 會再次出現 */
        reopen() {
            this.set(null)
        },

        track(name, params) {
            if (this.value !== 'granted') return

            if (!this.started) {
                this.queued.push([name, params])
                return
            }

            event(name, params)
        },

        async enable() {
            optIn()
            if (this.started) return
            this.started = true
            await addGtag()
            // addGtag() 開頭就同步推了 config，所以補送的事件必定排在它後面
            for (const [name, params] of this.queued.splice(0)) event(name, params)
        },

        /**
         * ⚠️ `null`（重新詢問）也必須停用：banner 跳出來時使用者尚未重新同意，
         * 那段期間繼續送 page_view 等於在「沒問過」的狀態下追蹤。
         */
        _apply(value) {
            this.value = value
            if (value === 'granted') this.enable()
            else this._disable()
        },

        /** ⚠️ 只清 cookie 不夠：pageTracker 的 `afterEach` 不經過 `track()` 的守衛 */
        _disable() {
            optOut()
            this._clearGaCookies()
        },

        /** 清掉 GA 種下的 cookie（`_ga`、`_ga_<id>`、`_gid`…）*/
        _clearGaCookies() {
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
        },

        _read() {
            try {
                return localStorage.getItem(STORAGE_KEY)
            } catch {
                return null
            }
        },

        _persist(value) {
            try {
                if (value == null) localStorage.removeItem(STORAGE_KEY)
                else localStorage.setItem(STORAGE_KEY, value)
            } catch {
                // 無痕模式寫不進去。同意不重載頁面，記憶體狀態撐得過這次瀏覽
            }
        },
    },
})
