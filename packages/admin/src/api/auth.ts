import http from './http'
import type { UserItem } from '@blog/shared'

export interface LoginPayload {
  username: string
  password: string
  /** 验证码 key（后端开启验证码时必填） */
  captchaKey?: string
  /** 验证码内容 */
  captchaCode?: string
  rememberMe?: boolean
}

export interface LoginResult {
  token: string
  tokenType: string
  expiresIn: number
  user: UserItem
}

/** 图形验证码：{ captchaKey, captchaImage(base64 dataURL), expiresIn } */
export function fetchCaptcha(): Promise<{ captchaKey: string; captchaImage: string; expiresIn: number }> {
  return http.get('/admin/auth/captcha')
}

export function login(payload: LoginPayload): Promise<LoginResult> {
  return http.post('/admin/auth/login', payload)
}

export function logout(): Promise<void> {
  return http.post('/admin/auth/logout')
}

export function profile(): Promise<UserItem> {
  return http.get('/admin/auth/profile')
}
