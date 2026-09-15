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
import { analyticsConfigured, gtagOptions, startAnalyticsWhenIdle } from './utils/analytics'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.directive('reveal', reveal)

// ⚠️ 與 GA4 後台「加強型評估」的網頁瀏覽會雙重計算，那個開關必須關著（docs/status.md）
if (analyticsConfigured) {
    app.use(createGtag(gtagOptions(router)))
}

// 訂購單只讀 localStorage，同步且不會失敗，先還原好讓 Navbar 首次繪製就有正確數量
import { useOrderStore } from './stores/order'
useOrderStore().init()

// 同理：banner 顯不顯示要在首次繪製就定案，不能等 GA 啟動
import { useConsentStore } from './stores/consent'
const consentStore = useConsentStore()
consentStore.init()

// 在 mount 前初始化認證狀態（只執行一次）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.init().then(() => {
    app.mount('#app')

    if (analyticsConfigured) startAnalyticsWhenIdle(consentStore)
})
