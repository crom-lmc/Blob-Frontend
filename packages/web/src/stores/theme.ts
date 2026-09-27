import { defineStore } from 'pinia'
import { DEFAULT_THEME } from '@blog/shared'
import type { ActiveTheme, ThemeConfig } from '@blog/shared'
import { fetchActiveTheme } from '@/api/public'
import {
  applyThemeConfig,
  ensureThemeStyleEl,
  readThemeCache,
  resolveMode,
  watchSystemTheme,
  writeThemeCache,
  type ThemeMode
} from '@/theme/bootstrap'

interface ThemeState {
  config: ThemeConfig
  version: number
  themeId: number
  mode: ThemeMode
  resolved: 'light' | 'dark'
  loaded: boolean
  /** 是否处于后台预览 iframe 中（预览态不写缓存、不请求接口覆盖） */
  preview: boolean
  /** 首屏是否已用本地缓存的主题 CSS 渲染（接口失败时不再回退默认主题） */
  hasCache: boolean
}

/**
 * 主题 Store：负责主题拉取、注入与明暗模式切换。
 * 所有前台样式只消费 CSS 变量，不直接读取 config（布局开关除外）。
 */
export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    config: DEFAULT_THEME,
    version: 0,
    themeId: 0,
    mode: 'system',
    resolved: 'light',
    loaded: false,
    preview: false,
    hasCache: false
  }),
  getters: {
    layout: (s) => s.config.layout,
    homeBlocks: (s) => [...(s.config.homeBlocks || [])].sort((a, b) => a.order - b.order),
    darkEnabled: (s) => s.config.dark.enabled
  },
  actions: {
    /** 应用配置到文档（真实刷新 CSS 变量） */
    apply(config: ThemeConfig, persist = true) {
      this.config = config
      const css = applyThemeConfig(config, this.mode)
      this.resolved = resolveMode(this.mode)
      if (persist) {
        writeThemeCache({ version: this.version, name: config.meta?.name || '', css, mode: this.mode })
      }
    },

    /** 初始化：先用缓存渲染，再按 version 决定是否拉取新主题 */
    async init() {
      const cache = readThemeCache()
      this.mode = (cache?.mode as ThemeMode) || 'system'
      if (cache?.css) {
        // 缓存命中：直接复用缓存里的 CSS（首屏零闪烁）。
        // 注意不要用 this.config 重新生成，否则会把主题缓存覆盖成默认主题。
        this.hasCache = true
        ensureThemeStyleEl().textContent = cache.css
        document.documentElement.dataset.theme = resolveMode(this.mode)
      }
      watchSystemTheme(() => {
        if (this.mode === 'system') {
          this.resolved = resolveMode('system')
          document.documentElement.dataset.theme = this.resolved
        }
      })
      await this.refresh()
    },

    /** 拉取线上生效主题（预览态跳过，避免覆盖编辑中的配置） */
    async refresh() {
      if (this.preview) return
      try {
        const data = await fetchActiveTheme()
        this.setActive(data)
      } catch {
        // 接口失败时兜底：已有缓存就继续用缓存，否则用默认主题，保证不白屏
        if (!this.loaded && !this.hasCache) this.apply(this.config)
        this.loaded = true
      }
    },

    setActive(data: ActiveTheme) {
      const nextVersion = data.version ?? 0
      this.themeId = data.id
      // version 一致则跳过，避免无谓重排
      if (this.loaded && nextVersion === this.version) return
      this.version = nextVersion
      this.apply(data.tokens || DEFAULT_THEME)
      this.loaded = true
    },

    /** 切换明暗模式 */
    setMode(mode: ThemeMode) {
      this.mode = mode
      this.resolved = resolveMode(mode)
      document.documentElement.dataset.theme = this.resolved
      const css = applyThemeConfig(this.config, this.mode)
      if (!this.preview) {
        writeThemeCache({ version: this.version, name: this.config.meta?.name || '', css, mode })
      }
    },

    /** 进入预览态（后台 iframe 通过 postMessage 下发配置） */
    enterPreview(config: ThemeConfig) {
      this.preview = true
      this.config = config
      applyThemeConfig(config, this.mode)
    },

    /** 预览态下实时更新（输入即生效） */
    updatePreview(config: ThemeConfig) {
      this.config = config
      applyThemeConfig(config, this.mode)
    }
  }
})
