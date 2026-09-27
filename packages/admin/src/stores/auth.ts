import { defineStore } from 'pinia'
import type { UserItem } from '@blog/shared'
import { login as apiLogin, logout as apiLogout, profile } from '@/api/auth'
import { clearToken, getToken, setToken } from '@/api/http'

/** 后台登录态与角色（admin 全权限，author 仅文章/媒体/评论） */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: null as UserItem | null
  }),
  getters: {
    isLogin: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin',
    nickname: (s) => s.user?.nickname || s.user?.username || '未登录'
  },
  actions: {
    async login(payload: { username: string; password: string; captchaKey?: string; captchaCode?: string; rememberMe?: boolean }) {
      const data = await apiLogin(payload)
      // 后端返回原始 JWT + tokenType，请求头需要 "Bearer <jwt>" 形式
      this.token = `${data.tokenType || 'Bearer'} ${data.token}`
      setToken(this.token)
      this.user = data.user
      return data.user
    },
    async loadProfile() {
      if (!this.token) return null
      try {
        this.user = await profile()
      } catch {
        this.logout()
      }
      return this.user
    },
    logout() {
      // 通知后端作废令牌（失败不阻塞本地登出）
      apiLogout().catch(() => {})
      this.token = ''
      this.user = null
      clearToken()
    }
  }
})
