import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // 憑證需涵蓋自訂 dev 網域，否則瀏覽器連 https://local.gtxin.com.tw:5174 會 CERT_COMMON_NAME_INVALID
    // ⚠️ dev 網域必須在 gtxin.com.tw 底下：Directus 的 SESSION_COOKIE_DOMAIN 是
    //    .gtxin.com.tw，用其他網域跑 dev 會拿不到 session cookie、登不進去
    mkcert({ hosts: ['localhost', '127.0.0.1', 'local.gtxin.com.tw'] })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // 只測純邏輯與 store，不碰 DOM——所以用 node 環境（不裝 jsdom），跑得快也不會
  // 讓測試跟 class 名稱之類的版面細節耦合。localStorage 由 setup 檔補上假的。
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.js'],
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    https: true,
    allowedHosts: ['local.gtxin.com.tw'],
    proxy: {
      '/api': {
        target: 'https://core.gtxin.com.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})