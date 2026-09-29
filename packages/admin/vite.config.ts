import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// 用相对路径引入：Vite 加载配置时会一起打包，避免被当作外部依赖由 Node 直接加载 TS
import { createMockApiPlugin } from '../shared/src/mock/plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const useMock = env.VITE_USE_MOCK !== 'false'
  const webHost = env.VITE_WEB_HOST || 'localhost'
  const webPort = Number(env.VITE_WEB_PORT || 5173)
  const adminPort = Number(env.VITE_ADMIN_PORT || 5174)
  const apiTarget = env.VITE_API_TARGET || `http://${webHost}:8080`
  const webOrigin = env.VITE_WEB_ORIGIN || `http://${webHost}:${webPort}`

  return {
    plugins: [vue(), ...(useMock ? [createMockApiPlugin({ webOrigin })] : [])],
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
      port: adminPort,
      host: true,
      proxy: useMock
        ? undefined
        : {
            '/api': { target: apiTarget, changeOrigin: true },
            '/uploads': { target: apiTarget, changeOrigin: true }
          }
    },
    build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }
  }
})
