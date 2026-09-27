import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { R } from '@blog/shared'

const TOKEN_KEY = 'blog.admin.token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const http = axios.create({
  baseURL: '/api',
  timeout: 20000
})

/** 后端 PageResult 使用 records 字段，前端统一归一化为 list */
function normalize<T>(data: T): T {
  if (data && typeof data === 'object' && Array.isArray((data as any).records)) {
    ;(data as any).list = (data as any).records
  }
  return data
}

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = token
  return config
})

/** 已被拦截器提示过的错误：页面 catch 中据此避免重复弹窗 */
export interface HttpError extends Error {
  notified?: boolean
}

/** 判断错误是否已经由拦截器弹过提示 */
export function isNotified(e: unknown): boolean {
  return !!(e as HttpError | null | undefined)?.notified
}

/**
 * 统一在此处提示，并打上 notified 标记。
 * 注意：消息只在这里弹一次，页面 catch 里不要再弹相同内容。
 */
function rejectWith(message: string): Promise<never> {
  ElMessage.error(message)
  const error = new Error(message) as HttpError
  error.notified = true
  return Promise.reject(error)
}

/** 统一错误提示 + 401 跳登录 */
http.interceptors.response.use(
  (res) => {
    const body = res.data as R
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return normalize(body.data)
      if (body.code === 401) {
        clearToken()
        if (!location.hash.startsWith('#/login')) location.hash = '#/login'
      }
      return rejectWith(body.message || '请求失败')
    }
    return body
  },
  (err) => {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err.message || '网络异常'
    if (status === 401) {
      // 静默跳登录，由页面自行决定是否提示
      clearToken()
      if (!location.hash.startsWith('#/login')) location.hash = '#/login'
      return Promise.reject(new Error(msg))
    }
    return rejectWith(msg)
  }
)

export default http
