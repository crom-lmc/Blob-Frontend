import type { ThemeConfig } from '@blog/shared'
import { themeCss } from '@blog/shared'

/** 主题缓存 key（与 index.html 内联脚本保持一致） */
export const THEME_CACHE_KEY = 'blog.theme.cache'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeCache {
  version: number
  name: string
  css: string
  mode: ThemeMode
}

/**
 * 获取（或创建）承载主题变量的 <style id="theme-vars">，并保证它位于 <head> 末尾。
 *
 * index.html 的防闪烁脚本会先插入这个元素，而 base.css 是之后才注入的，
 * 若不移动到末尾，主题变量会被 base.css 的同特异性 :root 覆盖（历史上就是这个坑）。
 */
export function ensureThemeStyleEl(): HTMLStyleElement {
  let el = document.getElementById('theme-vars') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'theme-vars'
  }
  // appendChild 对已存在的节点等价于「移动到末尾」
  document.head.appendChild(el)
  return el
}

/** 读取本地主题缓存 */
export function readThemeCache(): ThemeCache | null {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY)
    return raw ? (JSON.parse(raw) as ThemeCache) : null
  } catch {
    return null
  }
}

/** 写入本地主题缓存 */
export function writeThemeCache(cache: ThemeCache) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* 隐私模式下可能写入失败，忽略 */
  }
}

/** 系统是否偏好深色 */
export function systemPrefersDark(): boolean {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

/** 把模式解析为实际的明暗值 */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

/** 应用主题：写入 CSS 变量样式，并设置 data-theme */
export function applyThemeConfig(cfg: ThemeConfig, mode: ThemeMode) {
  const css = themeCss(cfg)
  ensureThemeStyleEl().textContent = css
  document.documentElement.dataset.theme = resolveMode(mode)
  return css
}

/** 监听系统深色偏好变化 */
export function watchSystemTheme(cb: (dark: boolean) => void): () => void {
  if (!window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => cb(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
