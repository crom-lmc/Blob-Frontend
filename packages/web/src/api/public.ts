import http from './http'
import type {
  ActiveTheme,
  ArchiveGroup,
  ArticleDetail,
  ArticleItem,
  CategoryItem,
  CommentItem,
  PageResult,
  SiteSettingsVO,
  TagItem
} from '@blog/shared'

/** 首屏聚合（主题 + 站点设置），可减少一次请求 */
export function fetchBootstrap(): Promise<{ theme: ActiveTheme; settings: SiteSettingsVO }> {
  return http.get('/public/bootstrap')
}

/** 当前生效主题（含后端生成的 css 字符串） */
export function fetchActiveTheme(): Promise<ActiveTheme> {
  return http.get('/public/theme/active')
}

/** 主题预览（后台编辑器通过一次性 token 下发） */
export function fetchThemePreview(token: string): Promise<ActiveTheme> {
  return http.get('/public/theme/preview', { params: { token } })
}

/** 站点设置聚合（后端 SiteSettingsVO：settings KV + 友链/社交/评论策略/页大小） */
export function fetchSettings(): Promise<SiteSettingsVO> {
  return http.get('/public/settings')
}

export interface ArticleQuery {
  keyword?: string
  categoryId?: number | string
  tagId?: number | string
  page?: number
  size?: number
  /** latest / hot / views / oldest / created / title（后端白名单） */
  sort?: 'latest' | 'hot' | 'views' | 'oldest' | 'created' | 'title'
  type?: string
}

export function fetchArticles(params: ArticleQuery): Promise<PageResult<ArticleItem>> {
  return http.get('/public/articles', { params })
}

export function fetchArticle(idOrSlug: string | number): Promise<ArticleDetail> {
  return http.get(`/public/articles/${encodeURIComponent(String(idOrSlug))}`)
}

/** 自定义页面（关于 / 友链等 type=page） */
export function fetchPage(slug: string): Promise<ArticleDetail> {
  return http.get(`/public/pages/${encodeURIComponent(slug)}`)
}

export function likeArticle(idOrSlug: string | number): Promise<number> {
  return http.post(`/public/articles/${encodeURIComponent(String(idOrSlug))}/like`)
}

/** 评论列表：后端返回分页 + replies（一层回复），这里归一化为 children 树 */
export async function fetchComments(idOrSlug: string | number, page = 1, size = 20): Promise<CommentItem[]> {
  const res = (await http.get(`/public/articles/${encodeURIComponent(String(idOrSlug))}/comments`, {
    params: { page, size }
  })) as unknown as PageResult<CommentItem> | CommentItem[]
  const records: CommentItem[] = Array.isArray(res) ? res : (res as any).records || (res as any).list || []
  return records.map((c) => ({
    ...c,
    isAdmin: c.isAdmin ? 1 : 0,
    children: c.replies || []
  }))
}

export function submitComment(payload: {
  articleIdOrSlug: string | number
  parentId?: number
  authorName: string
  authorEmail?: string
  authorSite?: string
  content: string
}): Promise<CommentItem> {
  return http.post('/public/comments', payload)
}

export function fetchCategories(): Promise<CategoryItem[]> {
  return http.get('/public/categories')
}

export function fetchCategoryArticles(slug: string, page = 1, size = 10): Promise<PageResult<ArticleItem>> {
  return http.get(`/public/categories/${encodeURIComponent(slug)}/articles`, { params: { page, size } })
}

export function fetchTags(): Promise<TagItem[]> {
  return http.get('/public/tags')
}

export function fetchTagArticles(slug: string, page = 1, size = 10): Promise<PageResult<ArticleItem>> {
  return http.get(`/public/tags/${encodeURIComponent(slug)}/articles`, { params: { page, size } })
}

/** 按月归档（后端 ArchiveGroupVO：{month, year, count, items}） */
export function fetchArchives(): Promise<ArchiveGroup[]> {
  return http.get('/public/archives')
}

/** 全文检索：q 必填；sort=relevance 走后端相关度（若后端支持），latest 回退到发布时间倒序 */
export function searchArticles(
  q: string,
  page = 1,
  size = 10,
  sort?: 'relevance' | 'latest'
): Promise<PageResult<ArticleItem>> {
  return http.get('/public/search', {
    params: { q, page, size, ...(sort ? { sort } : {}) }
  })
}
