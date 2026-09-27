import { defineStore } from 'pinia'
import { DEFAULT_THEME, deepClone, deepMerge } from '@blog/shared'
import type { ThemeConfig } from '@blog/shared'
import {
  createPreviewToken,
  createTheme,
  deleteTheme,
  fetchDefaultTheme,
  fetchThemeDetail,
  fetchThemePresets,
  fetchThemes,
  importTheme,
  publishTheme,
  saveThemeConfig
} from '@/api/system'
import type { ThemePresetItem, ThemeVO } from '@/api/system'

const MAX_HISTORY = 20

/** 键名排序的稳定序列化：避免字段顺序不同导致「等价配置」比较失败 */
function stableStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val) ?? 'null'
  if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`
  const obj = val as Record<string, unknown>
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`
}

/** 参与预设比对的配置：剔除 meta（name/version 会随发布变化，与视觉无关） */
function comparable(config: ThemeConfig): string {
  const rest = { ...(config as unknown as Record<string, unknown>) }
  delete rest.meta
  return stableStringify(rest)
}

/**
 * 主题编辑器 Store：
 * - 载入主题列表与当前编辑主题（后端 detail 含 config + css）
 * - 撤销/重做（最多 20 步）
 * - 预设（后端下发完整配置）
 * - 草稿保存 / 发布上线（version +1）
 * - 预览令牌（前台 iframe 按 token 拉取快照，编辑过程用 postMessage 实时下发）
 */
export const useThemeEditorStore = defineStore('themeEditor', {
  state: () => ({
    themeId: 0,
    name: '',
    description: '',
    version: 1,
    isActive: false,
    config: deepClone(DEFAULT_THEME) as ThemeConfig,
    themes: [] as ThemeVO[],
    presets: [] as ThemePresetItem[],
    history: [] as ThemeConfig[],
    historyIndex: -1,
    dirty: false,
    previewToken: '',
    previewUrl: '',
    loading: false
  }),
  getters: {
    canUndo: (s) => s.historyIndex > 0,
    canRedo: (s) => s.historyIndex < s.history.length - 1,
    /** 当前配置精确匹配的预设 key，用于预设列表高亮；手动改动过任何值则为空 */
    activePresetKey: (s) => {
      const current = comparable(s.config)
      return s.presets.find((p) => comparable(deepMerge(DEFAULT_THEME, p.config)) === current)?.key ?? ''
    }
  },
  actions: {
    async load() {
      this.loading = true
      try {
        this.themes = await fetchThemes()
        this.presets = await fetchThemePresets()
        const active = this.themes.find((t) => Number(t.isActive) === 1 || t.isActive === true) || this.themes[0]
        if (active) await this.select(active.id)
      } finally {
        this.loading = false
      }
    },

    /** 切换编辑的主题 */
    async select(id: number) {
      const detail = await fetchThemeDetail(id)
      this.themeId = detail.id
      this.name = detail.name
      this.description = detail.description
      this.version = detail.version
      this.isActive = Number(detail.isActive) === 1 || detail.isActive === true
      this.config = deepMerge(DEFAULT_THEME, detail.config) as ThemeConfig
      this.history = [deepClone(this.config)]
      this.historyIndex = 0
      this.dirty = false
      this.previewToken = ''
    },

    /** 配置变更后记录快照（最多 20 步） */
    commit() {
      this.dirty = true
      const snapshot = deepClone(this.config)
      // 丢弃 redo 分支
      this.history = this.history.slice(0, this.historyIndex + 1)
      this.history.push(snapshot)
      if (this.history.length > MAX_HISTORY) this.history.shift()
      this.historyIndex = this.history.length - 1
    },

    undo() {
      if (!this.canUndo) return
      this.historyIndex -= 1
      this.config = deepClone(this.history[this.historyIndex])
      this.dirty = true
    },

    redo() {
      if (!this.canRedo) return
      this.historyIndex += 1
      this.config = deepClone(this.history[this.historyIndex])
      this.dirty = true
    },

    /** 重置为内置默认主题（后端下发 default-theme.json） */
    async reset() {
      try {
        const cfg = await fetchDefaultTheme()
        this.config = deepMerge(DEFAULT_THEME, cfg) as ThemeConfig
      } catch {
        this.config = deepClone(DEFAULT_THEME)
      }
      this.commit()
    },

    /** 应用预设（后端下发完整配置） */
    applyPreset(preset: ThemePresetItem) {
      this.config = deepMerge(DEFAULT_THEME, preset.config) as ThemeConfig
      this.name = preset.name
      this.commit()
    },

    async saveDraft() {
      if (!this.themeId) return
      await saveThemeConfig(this.themeId, this.config)
      this.dirty = false
    },

    /** 发布上线：version +1，前台下次拉取 /theme/active 即生效 */
    async publish() {
      if (!this.themeId) return
      const vo = await publishTheme(this.themeId, this.config)
      this.version = vo?.version ?? this.version + 1
      this.config.meta = { ...this.config.meta, version: this.version }
      this.dirty = false
      this.isActive = true
      // 重新拉取列表：publish 会下线其他主题，下拉里的「生效中」标记必须同步刷新
      this.themes = await fetchThemes()
      return vo
    },

    /** 生成预览令牌（携带当前配置，后端缓存 15 分钟快照） */
    async newPreviewToken() {
      if (!this.themeId) return
      const res = await createPreviewToken(this.themeId, this.config)
      this.previewToken = res.token
      this.previewUrl = res.url
      return res
    },

    /** 新建主题 */
    async create(name: string, description?: string) {
      const res = await createTheme({ name, description })
      await this.load()
      await this.select(res.id)
      return res.id
    },

    /** 删除非内置主题；若删除的是当前编辑主题，切回生效中（或第一个）主题 */
    async remove(id: number) {
      await deleteTheme(id)
      this.themes = this.themes.filter((t) => t.id !== id)
      if (this.themeId === id) {
        const next =
          this.themes.find((t) => Number(t.isActive) === 1 || t.isActive === true) || this.themes[0]
        this.themeId = 0
        if (next) await this.select(next.id)
        else {
          this.config = deepClone(DEFAULT_THEME)
          this.name = ''
          this.version = 1
          this.dirty = false
        }
      }
    },

    /** 导出配置 JSON */
    exportJson(): string {
      return JSON.stringify({ name: this.name, version: this.version, config: this.config }, null, 2)
    },

    /** 下载导出文件 */
    downloadJson() {
      const blob = new Blob([this.exportJson()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.name || 'theme'}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    /** 从文件导入配置（创建新主题承载） */
    async importFromFile(file: File) {
      const text = await file.text()
      const data = JSON.parse(text)
      const cfg = (data.config || data) as ThemeConfig
      const res = await importTheme({ name: data.name || '导入主题', description: '', config: cfg })
      await this.load()
      await this.select(res.id)
    }
  }
})
