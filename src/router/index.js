import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Products from '../views/Products.vue'
import ProductDetail from '../views/ProductDetail.vue'

const routes = [
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { title: '金同心實業｜專業五金工具供應' }
    },
    {
        path: '/products',
        name: 'Products',
        component: Products,
        meta: { title: '所有商品｜金同心實業' }
    },
    {
        path: '/product/:slug',
        name: 'ProductDetail',
        component: ProductDetail,
        meta: { title: '商品｜金同心實業' } // ProductDetail 載入後會用實際商品名覆蓋
    },
    {
        path: '/order',
        name: 'OrderForm',
        component: () => import('../views/OrderForm.vue'),
        meta: { title: '訂購單｜金同心實業' }
    },
    {
        path: '/order/done/:id',
        name: 'OrderDone',
        component: () => import('../views/OrderDone.vue'),
        meta: { title: '訂購單已送出｜金同心實業', requiresAuth: true }
    },
    {
        path: '/account/orders',
        name: 'OrderHistory',
        component: () => import('../views/OrderHistory.vue'),
        meta: { title: '我的訂購單｜金同心實業', requiresAuth: true }
    },
    {
        path: '/account/orders/:id',
        name: 'OrderDetail',
        component: () => import('../views/OrderDetail.vue'),
        meta: { title: '訂購單明細｜金同心實業', requiresAuth: true }
    },
    {
        path: '/contact',
        name: 'Contact',
        component: () => import('../views/Contact.vue'),
        meta: { title: '聯絡我們｜金同心實業' }
    },
    {
        path: '/faq',
        name: 'Faq',
        component: () => import('../views/Faq.vue'),
        meta: { title: '常見問題｜金同心實業' }
    },
    {
        path: '/shipping',
        name: 'Shipping',
        component: () => import('../views/Shipping.vue'),
        meta: { title: '運送與退貨｜金同心實業' }
    },
    {
        path: '/warranty',
        name: 'Warranty',
        component: () => import('../views/Warranty.vue'),
        meta: { title: '保固資訊｜金同心實業' }
    },
    {
        path: '/privacy',
        name: 'Privacy',
        component: () => import('../views/Privacy.vue'),
        meta: { title: '隱私權政策｜金同心實業' }
    },
    {
        path: '/terms',
        name: 'Terms',
        component: () => import('../views/Terms.vue'),
        meta: { title: '服務條款｜金同心實業' }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/AdminLogin.vue'),
        meta: { title: '會員登入｜金同心實業' }
    },
    {
        path: '/admin/callback',
        name: 'AdminCallback',
        component: () => import('../views/AdminCallback.vue')
    },
    {
        path: '/account',
        name: 'Account',
        component: () => import('../views/Account.vue'),
        meta: { requiresAuth: true, title: '會員專區｜金同心實業' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

// 路由守衛：檢查是否登入
//
// 前台沒有「管理員」這個角色概念——後台作業一律在 Directus 自己的管理介面完成。
// 曾經有過 requiresAdmin 與 /admin 路由，但那個判斷在 Directus 11 之後恆為 false，
// 見 .claude/skills/routing-and-auth。要重新引入前，先讀那一節。
router.beforeEach(async (to) => {
    if (to.meta.requiresAuth) {
        const { useAuthStore } = await import('../stores/auth')
        const authStore = useAuthStore()

        // ⚠️ main.js 的 app.use(router) 會立刻觸發首次導航，那時 authStore.init()
        // 還沒 resolve，isAuthenticated 一律是 false。少了這一行，任何以完整網址
        // 直接開啟的受保護頁面都會被踢到 /login，AdminLogin 再把已登入的使用者
        // replace 到 /account —— 結果就是「網址列打 /account/orders 卻跳到 /account」。
        // init() 會共用進行中的那趟請求（見 auth store），這裡等它即可，不會重打 API。
        await authStore.init()

        if (!authStore.isAuthenticated) {
            return '/login'
        }
    }
})

// 套用每頁標題（ProductDetail 會在載入商品後自行覆蓋為商品名）
router.afterEach((to) => {
    if (to.meta?.title) document.title = to.meta.title
})

export default router
