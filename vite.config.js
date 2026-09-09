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
    //
    // ⚠️ 跑測試時要排除：mkcert 預設 apply: 'serve'，而 Vitest 是以 serve 模式解析
    //    設定，所以它會照樣執行——缺 binary 就下載、缺憑證就跑帶 -install 的命令。
    //    純邏輯測試不需要憑證，卻會在乾淨的機器或 CI runner 上因為下載限制或信任庫
    //    權限而在任何測試開始前就失敗。environment: 'node' 只決定測試的執行環境，
    //    不會停用 Vite 外掛。
    ...(process.env.VITEST
      ? []
      : [mkcert({ hosts: ['localhost', '127.0.0.1', 'local.gtxin.com.tw'] })]),
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