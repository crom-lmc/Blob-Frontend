import type { ThemeConfig } from '../types'
import { px } from '../utils'
import { derivePrimaryVariants, readableText } from './color'

/** 密度 → 间距单元（px） */
export const DENSITY_UNIT: Record<string, number> = {
  compact: 2,
  comfortable: 4,
  spacious: 6
}

/** 标题字号指数：h(n) = sizeBase × scaleRatio^exp[n-1] */
export const HEADING_EXPONENTS = [3, 2, 1.5, 1, 0.75, 0.25]

/** 生成间距刻度 --space-1 ~ --space-10（基于 --space-unit 计算，改单元即全局联动） */
const SPACE_STEPS = 10

/**
 * Token → CSS 变量映射（前端唯一约定，前后台共用）
 * @param cfg 主题配置
 * @param mode 明暗模式，dark 时叠加 dark.tokens 覆盖
 */
export function themeVars(cfg: ThemeConfig, mode: 'light' | 'dark' = 'light'): Record<string, string> {
  const color = { ...cfg.color }
  if (mode === 'dark' && cfg.dark?.enabled !== false) {
    Object.assign(color, cfg.dark?.tokens || {})
    // 深色下若未单独配置，主色 subtle 需要更暗的底色
    if (!cfg.dark?.tokens?.bg) color.bgSubtle = color.bgSubtle || cfg.color.bgSubtle
  }

  const pv = derivePrimaryVariants(color.primary)
  const font = cfg.font
  const vars: Record<string, string> = {}

  /* ---------------- 颜色 ---------------- */
  vars['--color-primary'] = color.primary
  vars['--color-primary-hover'] = color.primaryHover || pv.primaryHover
  vars['--color-primary-subtle'] = color.primarySubtle || pv.primarySubtle
  vars['--color-on-primary'] = readableText(color.primary)
  vars['--color-bg'] = color.bg
  vars['--color-bg-subtle'] = color.bgSubtle
  vars['--color-surface'] = color.surface
  vars['--color-text'] = color.text
  vars['--color-text-muted'] = color.textMuted
  vars['--color-text-invert'] = color.textInvert
  vars['--color-border'] = color.border
  vars['--color-link'] = color.link || color.primary
  vars['--color-success'] = color.success
  vars['--color-warning'] = color.warning
  vars['--color-danger'] = color.danger
  // 半透明派生色（阴影、遮罩等）
  vars['--color-shadow'] = color.text
  vars['--color-primary-a12'] = hexAlpha(color.primary, 0.12)
  vars['--color-primary-a24'] = hexAlpha(color.primary, 0.24)

  /* ---------------- 字体 ---------------- */
  vars['--font-body'] = font.familyBody
  vars['--font-heading'] = font.familyHeading === 'inherit' ? font.familyBody : font.familyHeading
  vars['--font-code'] = font.familyCode
  vars['--font-size-base'] = px(font.sizeBase)
  vars['--line-height'] = String(font.lineHeight)
  vars['--letter-spacing'] = px(font.letterSpacing)
  vars['--heading-weight'] = String(font.headingWeight)
  HEADING_EXPONENTS.forEach((exp, i) => {
    vars[`--font-size-h${i + 1}`] = px(font.sizeBase * Math.pow(font.scaleRatio, exp))
  })
  vars['--font-size-sm'] = px(font.sizeBase * 0.875)
  vars['--font-size-xs'] = px(font.sizeBase * 0.78)

  /* ---------------- 圆角 ---------------- */
  vars['--radius-sm'] = px(cfg.radius.sm)
  vars['--radius-md'] = px(cfg.radius.md)
  vars['--radius-lg'] = px(cfg.radius.lg)
  vars['--radius-full'] = px(cfg.radius.full)

  /* ---------------- 间距（密度覆盖 --space-unit） ---------------- */
  vars['--space-unit'] = px(DENSITY_UNIT[cfg.layout?.density] ?? cfg.space.unit)
  for (let i = 1; i <= SPACE_STEPS; i++) {
    vars[`--space-${i}`] = `calc(var(--space-unit) * ${i})`
  }
  vars['--content-width'] = px(cfg.space.contentWidth)
  vars['--container-width'] = px(cfg.space.containerWidth)
  vars['--section-gap'] = px(cfg.space.sectionGap)
  vars['--card-padding'] = px(cfg.space.cardPadding)
  vars['--header-height'] = `calc(var(--space-unit) * 16)`

  return vars
}

/** 变量表转 CSS 文本 */
export function varsToCssText(selector: string, vars: Record<string, string>): string {
  const body = Object.keys(vars)
    .map((k) => `  ${k}: ${vars[k]};`)
    .join('\n')
  return `${selector}{\n${body}\n}`
}

/**
 * 生成完整主题 CSS：:root + [data-theme="dark"] + customCss
 * 后端 /api/public/theme/active 返回同一份结构，前端直接注入 <style id="theme-vars">
 */
export function themeCss(cfg: ThemeConfig): string {
  const light = varsToCssText(':root', themeVars(cfg, 'light'))
  const dark = cfg.dark?.enabled ? varsToCssText('[data-theme="dark"]', themeVars(cfg, 'dark')) : ''
  const custom = sanitizeCustomCss(cfg.customCss)
  return [light, dark, custom].filter(Boolean).join('\n')
}

/** 把变量表写到元素内联样式（主题编辑器实时预览使用） */
export function applyThemeVars(el: HTMLElement, vars: Record<string, string>) {
  Object.keys(vars).forEach((k) => el.style.setProperty(k, vars[k]))
}

/** 自定义 CSS 安全校验：禁止 @import 外链与 javascript: */
export function sanitizeCustomCss(css: string): string {
  if (!css) return ''
  let out = css.replace(/@import\s+(url\()?\s*['"]?[^;)]+['"]?\s*\)?\s*;?/gi, '/* 已拦截：@import 外链被禁止 */')
  out = out.replace(/javascript\s*:/gi, '/* 已拦截 */:')
  out = out.replace(/expression\s*\(/gi, '/* 已拦截 */(')
  return out
}

/** 自定义 CSS 是否含风险内容 */
export function hasUnsafeCss(css: string): boolean {
  if (!css) return false
  return /@import/i.test(css) || /javascript\s*:/i.test(css) || /expression\s*\(/i.test(css)
}

function hexAlpha(hex: string, a: number): string {
  const h = (hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6)
  const num = parseInt(full || '000000', 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
