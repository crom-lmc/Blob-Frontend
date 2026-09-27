/** 日期与文本格式化 */

/** 2026-09-20 10:00:00 / 2026-09-20T10:00:00 → 2026年9月20日 */
export function formatDate(input: string, withTime = false): string {
  if (!input) return ''
  const raw = String(input).trim()
  // 后端返回 'YYYY-MM-DDTHH:mm:ss'，带 T 时无法与斜杠混用解析，先统一成空格形式；
  // 解析失败再交回原生（兼容 '...Z' / '+08:00' 等带时区的 ISO 串）。
  let d = new Date(raw.replace('T', ' ').replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const base = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  if (!withTime) return base
  const p = (n: number) => String(n).padStart(2, '0')
  return `${base} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** HTML 转义，防止 XSS */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[c]
  })
}

/** 关键词高亮：先转义再插入 <mark>，避免注入 */
export function highlight(text: string, keyword: string): string {
  if (!keyword) return escapeHtml(text || '')
  const safe = escapeHtml(text || '')
  const kw = escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp(kw, 'gi'), (m) => `<mark class="hl">${m}</mark>`)
}

/** 数字缩写：12000 → 1.2w */
export function formatCount(n: number): string {
  if (!n && n !== 0) return '0'
  if (n < 10000) return String(n)
  return `${(n / 10000).toFixed(1)}w`
}
