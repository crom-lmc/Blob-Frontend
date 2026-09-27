import axios from 'axios'
import type { R } from '@blog/shared'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000
})

/**
 * 后端 PageResult 使用 records 字段，前端类型约定为 list。
 * 在拦截器里统一归一化，页面代码无需关心差异。
 */
function normalize<T>(data: T): T {
  if (data && typeof data === 'object' && Array.isArray((data as any).records)) {
    ;(data as any).list = (data as any).records
  }
  return data
}

http.interceptors.response.use(
  (res) => {
    const body = res.data as R
    // 统一响应体：{ code, message, data }
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return normalize(body.data)
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return normalize(body)
  },
  (err) => {
    const msg = err?.response?.data?.message || err.message || '网络异常'
    return Promise.reject(new Error(msg))
  }
)

export default http
