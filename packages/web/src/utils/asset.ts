/**
 * 后端接口源（相对地址 /uploads/** 挂在该源下）
 *
 * 生产环境请把 VITE_API_TARGET 留空：表示「与当前站点同源」，
 * 由 nginx 把 /api、/uploads 反代到后端 8080。这样 http/https、域名/IP 全自适应，
 * 换域名或上 HTTPS 都不需要重新构建；dev 环境在 .env 里指向 http://127.0.0.1:8080。
 */
const apiOrigin = (import.meta.env.VITE_API_TARGET as string) || ''

/**
 * 历史数据里可能存了 `http://旧IP:8080/uploads/2026/09/xx.jpg` 这类绝对地址
 * （早期后台构建时把接口地址写死了，上传后拼成了绝对 URL）。
 * 换机/换域名后这些地址必然失效，这里统一收敛成 /uploads/... 的同源相对路径。
 */
function toUploadPath(rawUrl: string): string | null {
  const m = /^(?:https?:)?\/\/[^/]+(\/uploads\/.*)$/i.exec(rawUrl)
  return m ? m[1] : null
}

/**
 * 把后端返回的地址解析为可直接用于 <img> 的完整地址：
 * - 任意 host 的 /uploads/** 一律降级为同源相对地址（换机不失效）
 * - 已是 http(s):// 或 // 或 data: 的原样返回
 * - apiOrigin 为空（生产同源）时直接返回相对地址，交给浏览器按当前域名补全
 * - 否则把 /uploads/xx.png 这类相对地址拼到后端源
 */
export function resolveAssetUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return ''
  const uploadPath = toUploadPath(rawUrl)
  if (uploadPath) return apiOrigin ? apiOrigin.replace(/\/+$/, '') + uploadPath : uploadPath
  if (/^(https?:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl
  if (!apiOrigin) return rawUrl
  try {
    return new URL(rawUrl, apiOrigin).toString()
  } catch {
    return rawUrl
  }
}

/**
 * 正文 HTML（v-html 直出）里的图片地址归一化：
 * 把任意 host 的 /uploads/** 绝对地址降级为同源相对路径。
 * 存量的历史文章不必逐篇改库，渲染时兜底即可。
 */
export function normalizeHtmlAssets(html: string): string {
  if (!html) return ''
  return html.replace(
    /(?:https?:)?\/\/[^/"'\s>]+(\/uploads\/[^"'\s>]*)/gi,
    (_m, path: string) => (apiOrigin ? apiOrigin.replace(/\/+$/, '') + path : path)
  )
}
