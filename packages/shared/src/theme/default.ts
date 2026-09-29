import type { ThemeConfig } from '../types'

/**
 * 默认主题（与后端 t_theme 初始数据保持一致）
 * 注意：这是全工程唯一允许出现硬编码色值的地方之一（主题默认值）。
 */
export const DEFAULT_THEME: ThemeConfig = {
  meta: { name: '默认主题', version: 1 },
  color: {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primarySubtle: '#eef2ff',
    bg: '#ffffff',
    bgSubtle: '#f7f8fa',
    surface: '#ffffff',
    text: '#1f2328',
    textMuted: '#6b7280',
    textInvert: '#ffffff',
    border: '#e5e7eb',
    link: '#4f46e5',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626'
  },
  font: {
    familyBody: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    familyHeading: 'inherit',
    familyCode: "'JetBrains Mono', Consolas, Monaco, monospace",
    sizeBase: 16,
    scaleRatio: 1.25,
    lineHeight: 1.75,
    letterSpacing: 0,
    headingWeight: 700
  },
  radius: { sm: 6, md: 10, lg: 16, full: 9999 },
  space: {
    unit: 4,
    contentWidth: 760,
    containerWidth: 1200,
    sectionGap: 32,
    cardPadding: 20
  },
  layout: {
    homeLayout: 'list',
    sidebar: 'right',
    cardStyle: 'flat',
    density: 'comfortable',
    headerStyle: 'fixed',
    coverPosition: 'top',
    showToc: true,
    showBreadcrumb: true,
    showExcerpt: true,
    articleMetaOrder: ['date', 'category', 'tags', 'views'],
    postCardFields: ['cover', 'title', 'excerpt', 'meta', 'tags']
  },
  homeBlocks: [
    { type: 'hero', enabled: true, order: 1, props: { title: '', subtitle: '', align: 'center', images: [] } },
    { type: 'featured', enabled: false, order: 2, props: { count: 3 } },
    { type: 'latest', enabled: true, order: 3, props: { count: 10 } },
    { type: 'tagCloud', enabled: true, order: 4, props: { count: 30 } },
    { type: 'newsletter', enabled: false, order: 5, props: {} }
  ],
  dark: {
    enabled: true,
    defaultMode: 'system',
    tokens: {
      bg: '#12141a',
      bgSubtle: '#171a21',
      surface: '#1b1e26',
      text: '#e6e8ee',
      textMuted: '#9aa1af',
      border: '#2a2e38'
    }
  },
  customCss: '',
  customHeadHtml: ''
}

/** 字体栈下拉选项（后台主题编辑器使用） */
export const FONT_STACKS: { label: string; value: string }[] = [
  {
    label: '系统默认（PingFang / 微软雅黑）',
    value: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  },
  { label: '无衬线（Helvetica / Arial）', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: '衬线（思源宋体 / Georgia）', value: "'Noto Serif SC', Georgia, 'Songti SC', serif" },
  { label: '等宽（JetBrains Mono）', value: "'JetBrains Mono', Consolas, Monaco, monospace" }
]

/** 字号缩放比下拉选项 */
export const SCALE_RATIOS = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5]
