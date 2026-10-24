/** 通用工具方法 */

/** 深拷贝（结构化克隆优先，降级 JSON） */
export function deepClone<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(val)
    } catch {
      /* 忽略：存在函数等不可克隆字段时降级 */
    }
  }
  return JSON.parse(JSON.stringify(val)) as T
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return Object.prototype.toString.call(v) === '[object Object]'
}

/** 深合并：后者覆盖前者，对象递归，数组整体替换 */
export function deepMerge<T extends Record<string, any>>(base: T, patch?: Partial<T> | null): T {
  if (!patch) return deepClone(base)
  const out = deepClone(base) as Record<string, any>
  for (const key of Object.keys(patch)) {
    const pv = (patch as Record<string, any>)[key]
    if (pv === undefined) continue
    if (isPlainObject(pv) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], pv)
    } else if (Array.isArray(pv)) {
      out[key] = deepClone(pv)
    } else {
      out[key] = pv
    }
  }
  return out as T
}

/** px 数值转字符串 */
export function px(v: number | string): string {
  return typeof v === 'number' ? `${Math.round(v * 100) / 100}px` : v
}

/**
 * 复制文本到剪贴板。
 * navigator.clipboard 仅在安全上下文（HTTPS / localhost）可用，
 * 通过局域网 IP（http://192.168.x.x）访问时为 undefined，需降级 execCommand。
 * @returns 是否复制成功
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* 权限被拒等情况降级 execCommand */
    }
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '-9999px'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}
