import { fetchThemePreview } from '@/api/public'
import { useThemeStore } from '@/stores/theme'

/**
 * 预览承载逻辑（/preview 路由）：
 * 1. 带 token：后台生成预览令牌后，iframe 首次加载按 token 拉取预览主题（后端快照）。
 * 2. postMessage：编辑过程中后台把最新配置实时下发，前台立即覆盖 CSS 变量（输入即生效）。
 */
export function setupPreviewBridge() {
  const params = new URLSearchParams(location.search)
  if (!params.has('preview') && !params.has('token')) return

  const theme = useThemeStore()
  theme.preview = true

  // 首屏：按 token 拉取预览主题快照
  const token = params.get('token')
  if (token) {
    fetchThemePreview(token)
      .then((vo) => {
        if (vo?.tokens) theme.enterPreview(vo.tokens)
      })
      .catch(() => {
        // 令牌失效时退回线上主题
        theme.preview = false
        theme.refresh()
      })
  }

  window.addEventListener('message', (e: MessageEvent) => {
    const data = e.data
    if (!data || typeof data !== 'object') return
    switch (data.type) {
      case 'blog:theme:preview':
        theme.updatePreview(data.config)
        break
      case 'blog:theme:mode':
        theme.setMode(data.mode)
        break
      case 'blog:theme:reset':
        theme.preview = false
        theme.refresh()
        break
    }
  })

  // 告知父窗口：预览 iframe 已就绪，可以下发配置
  const send = () => window.parent?.postMessage({ type: 'blog:theme:ready' }, '*')
  send()
  window.addEventListener('load', send)
}
