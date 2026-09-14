import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createGtag } from 'vue-gtag'

// Self-hosted variable fonts (no external <link>)
import '@fontsource-variable/geist'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'

import './style.css'
import App from './App.vue'
import router from './router'
import { reveal } from './directives/reveal'
import { analyticsConfigured, consent, enableAnalytics } from './utils/analytics'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.directive('reveal', reveal)

// ⚠️ 與 GA4 後台「加強型評估」的網頁瀏覽會雙重計算，那個開關必須關著（docs/status.md）
if (analyticsConfigured) {
    app.use(
        createGtag({
            tagId: import.meta.env.VITE_GA_ID,
            // 同意之前一律不載入 gtag script，不是載入後再設 denied
            initMode: 'manual',
            pageTracker: {
                router,
                exclude: (route) => route.matched.some((r) => r.meta?.noAnalytics),
                // 預設的 template 是 route.name，報表會變成一排 "ProductDetail"。
                // ⚠️ page_title 讀 meta 而非 document.title：後者要等 router 的 afterEach
                //    先跑完才正確，而那只是註冊順序的巧合，沒有東西保證它。
                // ⚠️ page_path 要用實際路徑，換成 route.matched 的 pattern 會讓所有商品併成一列。
                template: (route) => ({
                    page_title: route.meta?.title ?? document.title,
                    page_path: route.path,
                    page_location: window.location.href,
                }),
            },
        })
    )
}

// 訂購單只讀 localStorage，同步且不會失敗，先還原好讓 Navbar 首次繪製就有正確數量
import { useOrderStore } from './stores/order'
useOrderStore().init()

// 在 mount 前初始化認證狀態（只執行一次）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.init().then(() => {
    app.mount('#app')

    // 擺在 mount 之後：addGtag() 會同步插入 script tag，放在前面等於把跨網域請求塞進
    // 畫面還沒繪製的那段。延後不會漏掉這一頁——addGtag 內部會先 await router.isReady()
    // 再追蹤當前路由。
    if (analyticsConfigured && consent.value === 'granted') {
        ;(window.requestIdleCallback ?? setTimeout)(() => enableAnalytics())
    }
})
