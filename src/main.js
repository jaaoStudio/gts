import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

// 在 mount 前初始化認證狀態（只執行一次）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.init().then(() => {
    app.mount('#app')
})
