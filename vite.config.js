import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // 憑證需涵蓋自訂 dev 網域，否則瀏覽器連 https://local.jaao.tw:5174 會 CERT_COMMON_NAME_INVALID
    mkcert({ hosts: ['localhost', '127.0.0.1', 'local.jaao.tw'] })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    https: true,
    allowedHosts: ['local.jaao.tw'],
    proxy: {
      '/api': {
        target: 'https://gts-core.jaao.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})