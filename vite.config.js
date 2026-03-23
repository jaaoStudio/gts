import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    mkcert()
  ],
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