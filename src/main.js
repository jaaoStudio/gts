import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createGtag, addGtag } from 'vue-gtag'

// Self-hosted variable fonts (no external <link>)
import '@fontsource-variable/geist'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'

import './style.css'
import App from './App.vue'
import router from './router'
import { reveal } from './directives/reveal'
import { consent } from './utils/analytics'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.directive('reveal', reveal)

// GA4。這個 if 不可拿掉：VITE_GA_ID 只在 CI build 時注入（見 Dockerfile），
// 本機 dev 與 preview 沒有它就整個不掛，免得把測試流量送進正式站報表。
//
// ⚠️ pageTracker 會在每次路由切換送 page_view。GA4 資料串流的「加強型評估」
//    預設也會靠 History Change 自己抓 SPA 換頁 —— 兩邊同時開會讓每次換頁算兩次。
//    後台那個開關必須關著，而它不在這個 repo 裡，改這段前先去確認。
if (import.meta.env.VITE_GA_ID) {
    app.use(
        createGtag({
            tagId: import.meta.env.VITE_GA_ID,
            // 同意之前一律不載入 gtag script，不是載入後再設 denied
            initMode: 'manual',
            pageTracker: {
                router,
                // 這些路徑帶訂購單 id，每張單都會變成一條一次性路徑把報表洗版，
                // 而且只有下單者本人看得到，對流量與商品熱度沒有貢獻。
                // ⚠️ 不要順手把 /product/:slug 也正規化掉——商品熱度正是靠它分辨的。
                exclude: (route) =>
                    route.path.startsWith('/account') || route.path.startsWith('/order/done'),
                // 預設的 template 是 route.name，報表會變成一排 "ProductDetail"。
                // 這裡靠 router/index.js 的 afterEach 已把 document.title 設好——
                // afterEach 依註冊順序執行，那支先註冊，所以讀得到新標題。
                template: (route) => ({
                    page_title: document.title,
                    page_path: route.path,
                    page_location: window.location.href,
                }),
            },
        })
    )

    if (consent.value === 'granted') addGtag()
}

// 訂購單只讀 localStorage，同步且不會失敗，先還原好讓 Navbar 首次繪製就有正確數量
import { useOrderStore } from './stores/order'
useOrderStore().init()

// 在 mount 前初始化認證狀態（只執行一次）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.init().then(() => {
    app.mount('#app')
})
