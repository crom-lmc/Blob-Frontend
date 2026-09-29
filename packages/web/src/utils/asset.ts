/** 后端接口源（相对地址 /uploads/** 挂在该源下） */
const apiOrigin = (import.meta.env.VITE_API_TARGET as string) || 'http://localhost:8080'

/**
 * 把后端返回的地址解析为可直接用于 <img> 的完整地址：
 * - 已是 http(s):// 或 // 或 data: 的原样返回
 * - 以 / 开头的相对地址（如 /uploads/xx.png）拼到后端源
 */
export function resolveAssetUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return ''
  if (/^(https?:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl
  try {
    return new URL(rawUrl, apiOrigin).toString()
  } catch {
    return rawUrl
  }
}
