import { defineStore } from 'pinia'
import type { FriendLink, SiteSettingsVO, SocialLink } from '@blog/shared'
import { fetchSettings } from '@/api/public'

/** 前台站点设置：来自后端 SiteSettingsVO 聚合结果 */
export const useSiteStore = defineStore('site', {
  state: () => ({
    /** 原始 KV 配置（site_title 等） */
    map: {} as Record<string, string>,
    friendLinks: [] as FriendLink[],
    socialLinks: [] as SocialLink[],
    commentReviewOn: true,
    pageSize: 10,
    loaded: false
  }),
  getters: {
    /** 兼容旧代码的访问方式（site.settings.site_title） */
    settings: (s) => s.map,
    title: (s) => s.map.site_title || '博客',
    subtitle: (s) => s.map.site_subtitle || '',
    footer: (s) => s.map.site_footer || '',
    icp: (s) => s.map.icp_no || '',
    seoDesc: (s) => s.map.seo_desc || '',
    seoKeywords: (s) => s.map.seo_keywords || ''
  },
  actions: {
    async load() {
      try {
        const vo = await fetchSettings()
        this.map = vo.settings || {}
        this.friendLinks = vo.friendLinks || []
        this.socialLinks = vo.socialLinks || []
        this.commentReviewOn = vo.commentReviewOn !== false
        this.pageSize = vo.pageSize || 10
        this.applyDocumentMeta()
      } catch {
        // 接口失败时保持默认，保证页面可用
      }
      this.loaded = true
    },
    /** 同步站点标题 / favicon / SEO 描述到文档 */
    applyDocumentMeta() {
      document.title = this.title
      const favicon = this.map.site_favicon
      if (favicon) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = favicon
      }
      const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (desc && this.seoDesc) desc.content = this.seoDesc
      const keywords = document.querySelector<HTMLMetaElement>('meta[name="keywords"]')
      if (keywords && this.seoKeywords) keywords.content = this.seoKeywords
    }
  }
})
