import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Self-hosted variable fonts (no external <link>)
import '@fontsource-variable/geist'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'

import './style.css'
import App from './App.vue'
import router from './router'
import { reveal } from './directives/reveal'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.directive('reveal', reveal)

// 訂購單只讀 localStorage，同步且不會失敗，先還原好讓 Navbar 首次繪製就有正確數量
import { useOrderStore } from './stores/order'
useOrderStore().init()

// 在 mount 前初始化認證狀態（只執行一次）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.init().then(() => {
    app.mount('#app')
})
