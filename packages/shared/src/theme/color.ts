/**
 * 颜色工具：用于主色派生 hover / subtle 变体，避免让用户手填三个色值。
 */

export interface RGB {
  r: number
  g: number
  b: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isHexColor(input: string): boolean {
  return HEX_RE.test((input || '').trim())
}

/** 支持 #rgb / #rrggbb / #rrggbbaa */
export function hexToRgb(hex: string): RGB {
  let h = (hex || '').trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length === 8) h = h.slice(0, 6)
  const num = parseInt(h || '000000', 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

/** 向黑色靠拢 amount（0~1） */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const k = 1 - clamp01(amount)
  return rgbToHex({ r: r * k, g: g * k, b: b * k })
}

/** 向白色靠拢 amount（0~1） */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const k = clamp01(amount)
  return rgbToHex({ r: r + (255 - r) * k, g: g + (255 - g) * k, b: b + (255 - b) * k })
}

/** 两色混合，weight 为 color 占比 */
export function mix(a: string, b: string, weight: number): string {
  const c1 = hexToRgb(a)
  const c2 = hexToRgb(b)
  const w = clamp01(weight)
  return rgbToHex({
    r: c1.r * w + c2.r * (1 - w),
    g: c1.g * w + c2.g * (1 - w),
    b: c1.b * w + c2.b * (1 - w)
  })
}

/** 带透明度的 rgba 字符串 */
export function alpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`
}

/** 相对亮度（WCAG） */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** 给定背景色，返回可读的前景色（黑或白） */
export function readableText(hex: string): string {
  return luminance(hex) > 0.55 ? '#111827' : '#ffffff'
}

/** 由主色派生 hover / subtle / 前景色 */
export function derivePrimaryVariants(primary: string) {
  const isLight = luminance(primary) > 0.6
  return {
    primary,
    primaryHover: isLight ? darken(primary, 0.16) : lighten(primary, 0.14),
    primarySubtle: mix(primary, '#ffffff', 0.12),
    onPrimary: readableText(primary)
  }
}

/** 生成标签自动配色（按名称哈希，保证稳定） */
export function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return hslToHex(hue, 62, 48)
}

export function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100
  const L = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = S * Math.min(L, 1 - L)
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 })
}
