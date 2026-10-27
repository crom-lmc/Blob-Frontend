/**
 * 后端接口源（相对地址 /uploads/** 挂在该源下）
 *
 * 生产环境请把 VITE_API_TARGET 留空：表示「与当前站点同源」，
 * 由 nginx 把 /api、/uploads 反代到后端 8080。这样 http/https、域名/IP 全自适应，
 * 换域名或上 HTTPS 都不需要重新构建；dev 环境在 .env 里指向 http://127.0.0.1:8080。
 */
const apiOrigin = (import.meta.env.VITE_API_TARGET as string) || ''

/**
 * 把后端返回的地址解析为可直接用于 <img> 的完整地址：
 * - 已是 http(s):// 或 // 或 data: 的原样返回
 * - apiOrigin 为空（生产同源）时直接返回相对地址，交给浏览器按当前域名补全
 * - 否则把 /uploads/xx.png 这类相对地址拼到后端源
 */
export function resolveAssetUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return ''
  if (/^(https?:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl
  if (!apiOrigin) return rawUrl
  try {
    return new URL(rawUrl, apiOrigin).toString()
  } catch {
    return rawUrl
  }
}
