import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// 用相对路径引入：Vite 加载配置时会一起打包，避免被当作外部依赖由 Node 直接加载 TS
import { createMockApiPlugin } from '../shared/src/mock/plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const useMock = env.VITE_USE_MOCK !== 'false'
  // 前台地址：主题编辑器预览 iframe 指向它
  const webOrigin = env.VITE_WEB_ORIGIN || 'http://localhost:5173'

  return {
    plugins: [vue(), ...(useMock ? [createMockApiPlugin()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@blog/shared': fileURLToPath(new URL('../shared/src', import.meta.url))
      }
    },
    define: {
      __WEB_ORIGIN__: JSON.stringify(webOrigin)
    },
    server: {
      port: 5174,
      host: true,
      proxy: useMock
        ? undefined
        : {
            '/api': { target: env.VITE_API_TARGET || 'http://localhost:8080', changeOrigin: true },
            '/uploads': { target: env.VITE_API_TARGET || 'http://localhost:8080', changeOrigin: true }
          }
    },
    build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }
  }
})
