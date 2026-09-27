import type { ThemeConfig } from '../types'
import { DEFAULT_THEME } from './default'
import { deepMerge } from '../utils'
import { derivePrimaryVariants } from './color'

/** 内置预设主题：默认蓝、暗夜、极简黑白、暖橙、森绿 */
export interface ThemePreset {
  id: string
  name: string
  description: string
  /** 预览用主色 */
  previewColor: string
  config: ThemeConfig
}

function buildPreset(
  id: string,
  name: string,
  description: string,
  patch: any
): ThemePreset {
  const config = deepMerge(DEFAULT_THEME, patch)
  const pv = derivePrimaryVariants(config.color.primary)
  config.color.primaryHover = pv.primaryHover
  config.color.primarySubtle = pv.primarySubtle
  config.color.link = config.color.primary
  config.meta = { name, version: 1 }
  return { id, name, description, previewColor: config.color.primary, config }
}

export const THEME_PRESETS: ThemePreset[] = [
  buildPreset('default', '默认蓝', '清爽的靛蓝主色，适合技术博客', {}),
  buildPreset('midnight', '暗夜', '深色优先，护眼阅读', {
    color: { primary: '#7c9cff', bg: '#12141a', bgSubtle: '#171a21', surface: '#1b1e26', text: '#e6e8ee', textMuted: '#9aa1af', border: '#2a2e38' },
    layout: { cardStyle: 'bordered' },
    dark: { enabled: true, defaultMode: 'dark' }
  }),
  buildPreset('mono', '极简黑白', '无彩色，极致克制', {
    color: { primary: '#111827', bg: '#ffffff', bgSubtle: '#f5f5f5', surface: '#ffffff', text: '#111827', textMuted: '#6b7280', border: '#e5e5e5' },
    radius: { sm: 2, md: 4, lg: 6, full: 9999 },
    layout: { cardStyle: 'bordered', density: 'compact' },
    font: { familyHeading: 'inherit' }
  }),
  buildPreset('warm', '暖橙', '暖色调，适合生活随笔', {
    color: { primary: '#ea580c', bg: '#fffaf3', bgSubtle: '#fdf3e7', surface: '#ffffff', text: '#3f2d20', textMuted: '#8a6a53', border: '#f0dfcb' },
    radius: { sm: 8, md: 14, lg: 22, full: 9999 },
    layout: { density: 'spacious' }
  }),
  buildPreset('forest', '森绿', '自然系绿色，柔和护眼', {
    color: { primary: '#15803d', bg: '#fbfdfb', bgSubtle: '#eef7f0', surface: '#ffffff', text: '#1c2b22', textMuted: '#5f7a68', border: '#d8e8dc' },
    radius: { sm: 10, md: 16, lg: 24, full: 9999 },
    layout: { density: 'comfortable' }
  })
]

export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}
