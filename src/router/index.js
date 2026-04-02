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
        component: Home
    },
    {
        path: '/products',
        name: 'Products',
        component: Products
    },
    {
        path: '/product/:slug',
        name: 'ProductDetail',
        component: ProductDetail
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/AdminLogin.vue')
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
        meta: { requiresAuth: true }
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/Admin.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
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

export default router
