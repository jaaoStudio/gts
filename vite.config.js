import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // https: {
    //   key: fs.readFileSync('./vite-key.pem'),
    //   cert: fs.readFileSync('./vite.pem'),
    // },
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://gts-core.jaao.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
