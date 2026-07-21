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
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/Admin.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '管理後台｜金同心實業' }
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

// 路由守衛：檢查認證與管理員權限
router.beforeEach(async (to) => {
    if (to.meta.requiresAuth || to.meta.requiresAdmin) {
        const { useAuthStore } = await import('../stores/auth')
        const authStore = useAuthStore()

        // 未登入 → 登入頁
        if (!authStore.isAuthenticated) {
            return '/login'
        }

        // 需要管理員權限但使用者不是管理員 → 導向會員頁
        if (to.meta.requiresAdmin && !authStore.isAdmin) {
            return '/account'
        }
    }
})

// 套用每頁標題（ProductDetail 會在載入商品後自行覆蓋為商品名）
router.afterEach((to) => {
    if (to.meta?.title) document.title = to.meta.title
})

export default router
