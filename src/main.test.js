// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('./utils/directus')
vi.mock('./stores/auth', () => ({
    useAuthStore: () => ({ init: async () => {}, isAuthenticated: true }),
}))
vi.mock('./App.vue', () => ({ default: { template: '<main>店面</main>' } }))

const TAG_ID = 'G-BOOTSTRAP-TEST'
let idle, listeners

const commands = () => (window.dataLayer ?? []).map((args) => Array.from(args))
const pageViews = () => commands().filter(([command, name]) => command === 'event' && name === 'page_view')

beforeEach(async () => {
    vi.resetModules()
    // vue-gtag 的套件單例不隨 resetModules 重建；避免跨測試合併兩個 router。
    const { configure } = await import('vue-gtag')
    configure({ tagId: undefined, pageTracker: undefined, initMode: 'auto' })
    vi.stubEnv('VITE_GA_ID', TAG_ID)
    vi.stubGlobal('requestIdleCallback', (callback) => { idle = callback })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    listeners = vi.spyOn(window, 'addEventListener')
    window.history.replaceState({}, '', '/')
    document.body.innerHTML = '<div id="app"></div>'
    delete window.dataLayer
    delete window.gtag
    delete window[`ga-disable-${TAG_ID}`]
    idle = undefined
})

afterEach(async () => {
    // main.js 建立的 app、Pinia 與跨分頁監聽都屬於這次模擬的頁面。
    const app = document.querySelector('#app').__vue_app__
    if (app) {
        const { disposePinia } = await import('pinia')
        disposePinia(app.config.globalProperties.$pinia)
        app.unmount()
    }
    for (const [type, listener, options] of listeners.mock.calls) {
        window.removeEventListener(type, listener, options)
    }
    document.querySelectorAll('script[src*="googletagmanager.com"]').forEach((script) => script.remove())
    await flushPromises()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

const boot = async (consent, path = '/') => {
    if (consent) localStorage.setItem('gts_analytics_consent', consent)
    window.history.replaceState({}, '', path)
    await import('./main')
    const router = (await import('./router')).default
    await router.isReady()
    await flushPromises()
    expect(document.querySelector('#app').textContent).toContain('店面')
    return router
}

// 使用真正的 createGtag、router 與 consent store；只模擬外部 script 載入完成。
const runIdle = async () => {
    expect(idle).toBeTypeOf('function')
    idle()
    document.querySelectorAll('script[src*="googletagmanager.com"]').forEach((script) => {
        script.dispatchEvent(new Event('load'))
    })
    await flushPromises()
}

describe('main.js 的分析啟動接線', () => {
    test.each([null, 'denied'])('未同意或已拒絕時不載入 GA：%s', async (consent) => {
        await boot(consent)
        expect(commands()).toEqual([])
        await runIdle()
        expect(commands()).toEqual([])
        expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull()
    })

    test('已同意的回訪者會在 idle 才啟動，公開頁只送一次且使用頁面標題', async () => {
        const router = await boot('granted')
        expect(commands()).toEqual([])
        await runIdle()

        expect(commands().filter(([command, id]) => command === 'config' && id === TAG_ID)).toHaveLength(1)
        expect(pageViews()).toHaveLength(1)
        expect(pageViews()[0][2]).toMatchObject({ page_path: '/', page_title: '金同心實業｜專業五金工具供應' })

        await router.push('/product/hammer')
        expect(pageViews()).toHaveLength(2)
        expect(pageViews()[1][2]).toMatchObject({ page_path: '/product/hammer', page_title: '商品｜金同心實業' })
    })

    test('idle 等待期間撤回，就不啟動 GA', async () => {
        await boot('granted')
        const { useConsentStore } = await import('./stores/consent')
        useConsentStore().set('denied')
        await runIdle()
        expect(commands()).toEqual([])
        expect(window[`ga-disable-${TAG_ID}`]).toBe(true)
    })

    test('私人頁與私人 404 不產生 page_view，公開 404 仍有紀錄', async () => {
        const router = await boot('granted', '/account/orders/42/x')
        await runIdle()
        expect(pageViews()).toHaveLength(0)

        for (const path of ['/account', '/account/orders/42', '/order/done/42', '/order/done/42/x']) {
            await router.push(path)
            expect(pageViews(), path).toHaveLength(0)
        }
        await router.push('/missing-product')
        expect(pageViews()).toHaveLength(1)
        expect(pageViews()[0][2]).toMatchObject({ page_path: '/missing-product', page_title: '找不到頁面｜金同心實業' })
    })

    test('沒有 GA ID 時，即使曾經同意也不啟動或累積事件', async () => {
        vi.stubEnv('VITE_GA_ID', '')
        await boot('granted')
        const { useConsentStore } = await import('./stores/consent')
        const store = useConsentStore()
        store.track('view_item', { items: [] })
        expect(store.queued).toEqual([])
        await store.enable()

        expect(idle).toBeUndefined()
        expect(store.queued).toEqual([])
        expect(store.started).toBe(false)
        expect(commands()).toEqual([])
    })
})
