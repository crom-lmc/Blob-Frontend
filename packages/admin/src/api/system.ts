import http from './http'
import type { ActiveTheme, DashboardStats, OperationLogItem, PageResult, SiteSettings, ThemeConfig, UserItem } from '@blog/shared'

/* ==================== 仪表盘（StatController） ==================== */

export function fetchStats(): Promise<DashboardStats> {
  return http.get('/admin/dashboard/stats')
}

/* ==================== 用户（AdminUserController） ==================== */

export function fetchUsers(params: {
  keyword?: string
  role?: string
  page?: number
  size?: number
}): Promise<PageResult<UserItem>> {
  return http.get('/admin/users', { params })
}

export function createUser(payload: {
  username: string
  password: string
  nickname?: string
  email?: string
  avatar?: string
  role?: string
  status?: number
}): Promise<number> {
  return http.post('/admin/users', payload)
}

export function updateUser(
  id: number,
  payload: { username?: string; nickname?: string; email?: string; avatar?: string; role?: string; status?: number }
): Promise<void> {
  return http.put(`/admin/users/${id}`, payload)
}

export function updateUserStatus(id: number, status: number): Promise<void> {
  return http.put(`/admin/users/${id}/status`, null, { params: { status } })
}

export function changeUserPassword(id: number, newPassword: string, oldPassword?: string): Promise<void> {
  return http.put(`/admin/users/${id}/password`, { oldPassword, newPassword })
}

export function deleteUser(id: number): Promise<void> {
  return http.delete(`/admin/users/${id}`)
}

/* ==================== 站点设置（AdminSettingController） ==================== */

export function fetchSettings(): Promise<SiteSettings> {
  return http.get('/admin/settings')
}

export function saveSettings(payload: Partial<SiteSettings>): Promise<void> {
  return http.put('/admin/settings', payload)
}

/* ==================== 主题（AdminThemeController） ==================== */

export interface ThemeVO {
  id: number
  name: string
  description: string
  /** Integer 0/1 */
  isActive: number | boolean
  /** 内置/默认主题标识：1=内置（不可删除），后端始终返回；旧响应可能缺失 */
  isBuiltin?: number | boolean
  version: number
  updatedAt: string
}

export interface ThemeDetailVO extends ThemeVO {
  config: ThemeConfig
  css: string
}

export interface ThemePresetItem {
  key: string
  name: string
  description: string
  config: ThemeConfig
}

export function fetchThemes(): Promise<ThemeVO[]> {
  return http.get('/admin/themes')
}

export function fetchThemeDetail(id: number): Promise<ThemeDetailVO> {
  return http.get(`/admin/themes/${id}`)
}

export function fetchThemePresets(): Promise<ThemePresetItem[]> {
  return http.get('/admin/themes/presets')
}

/** 内置默认主题配置（「重置为默认」使用） */
export function fetchDefaultTheme(): Promise<ThemeConfig> {
  return http.get('/admin/themes/default')
}

export function createTheme(payload: { name: string; description?: string; copyFromId?: number }): Promise<{ id: number }> {
  return http.post('/admin/themes', payload)
}

export function updateTheme(id: number, payload: { name?: string; description?: string }): Promise<void> {
  return http.put(`/admin/themes/${id}`, payload)
}

export function copyTheme(id: number): Promise<{ id: number }> {
  return http.post(`/admin/themes/${id}/copy`)
}

export function deleteTheme(id: number): Promise<void> {
  return http.delete(`/admin/themes/${id}`)
}

/** 保存草稿：请求体即 ThemeConfig，只落库不刷新前台缓存 */
export function saveThemeConfig(id: number, config: ThemeConfig): Promise<void> {
  return http.put(`/admin/themes/${id}/config`, config)
}

/** 发布上线：保存配置并启用，version +1，刷新 Redis 缓存 */
export function publishTheme(id: number, config: ThemeConfig): Promise<ActiveTheme> {
  return http.post(`/admin/themes/${id}/publish`, config)
}

/** 启用主题（不传配置，使用已保存草稿） */
export function activateTheme(id: number): Promise<ActiveTheme> {
  return http.post(`/admin/themes/${id}/activate`)
}

/** 生成预览令牌（15 分钟有效），前台通过 /public/theme/preview?token= 消费 */
export function createPreviewToken(id: number, config: ThemeConfig): Promise<{ token: string; url: string; expiresIn: number }> {
  return http.post(`/admin/themes/${id}/preview`, config)
}

/** 导出主题配置 JSON */
export function exportTheme(id: number): Promise<ThemeConfig> {
  return http.get(`/admin/themes/${id}/export`)
}

/** 导入主题配置（创建新主题承载） */
export function importTheme(payload: { name: string; description?: string; config: ThemeConfig }): Promise<{ id: number }> {
  return http.post('/admin/themes/import', payload)
}

/* ==================== 操作日志（AdminLogController） ==================== */

export function fetchLogs(params: {
  module?: string
  action?: string
  keyword?: string
  page?: number
  size?: number
}): Promise<PageResult<OperationLogItem>> {
  return http.get('/admin/logs', { params })
}

/** 清理 days 天之前的历史日志 */
export function cleanLogs(days = 90): Promise<number> {
  return http.delete('/admin/logs/clean', { params: { days } })
}
