/**
 * 全局类型定义：主题配置 + 接口 DTO
 * 前端（前台 / 后台）共用，保证两侧对主题结构理解完全一致。
 */

/* ============================ 主题配置 ============================ */

/** 颜色令牌 */
export interface ColorTokens {
  primary: string
  primaryHover: string
  primarySubtle: string
  bg: string
  bgSubtle: string
  surface: string
  text: string
  textMuted: string
  textInvert: string
  border: string
  link: string
  success: string
  warning: string
  danger: string
}

/** 字体令牌 */
export interface FontTokens {
  familyBody: string
  familyHeading: string
  familyCode: string
  /** 基准字号 px */
  sizeBase: number
  /** 标题字号缩放比 */
  scaleRatio: number
  lineHeight: number
  /** 字间距 px */
  letterSpacing: number
  headingWeight: number
}

/** 圆角令牌 px */
export interface RadiusTokens {
  sm: number
  md: number
  lg: number
  full: number
}

/** 间距与容器令牌 px */
export interface SpaceTokens {
  /** 间距基准单元 px */
  unit: number
  /** 正文阅读区宽度 */
  contentWidth: number
  /** 页面容器最大宽度 */
  containerWidth: number
  /** 区块之间的间距 */
  sectionGap: number
  /** 卡片内边距 */
  cardPadding: number
}

/** 布局令牌 */
export interface LayoutTokens {
  homeLayout: 'list' | 'grid' | 'magazine'
  sidebar: 'left' | 'right' | 'none'
  cardStyle: 'flat' | 'elevated' | 'bordered'
  density: 'compact' | 'comfortable' | 'spacious'
  headerStyle: 'fixed' | 'static' | 'transparent'
  coverPosition: 'top' | 'left' | 'background'
  showToc: boolean
  showBreadcrumb: boolean
  showExcerpt: boolean
  articleMetaOrder: string[]
  postCardFields: string[]
}

/** 首页区块 */
export interface HomeBlock {
  type: 'hero' | 'featured' | 'latest' | 'tagCloud' | 'newsletter'
  enabled: boolean
  order: number
  props: Record<string, any>
}

/** 深色模式配置 */
export interface DarkConfig {
  enabled: boolean
  /** light / dark / system */
  defaultMode: 'light' | 'dark' | 'system'
  /** 深色下被覆盖的颜色令牌 */
  tokens: Partial<ColorTokens>
}

/** 完整主题配置（对应 t_theme.config_json） */
export interface ThemeConfig {
  meta: { name: string; version: number }
  color: ColorTokens
  font: FontTokens
  radius: RadiusTokens
  space: SpaceTokens
  layout: LayoutTokens
  homeBlocks: HomeBlock[]
  dark: DarkConfig
  customCss: string
  customHeadHtml: string
}

/** 前台运行时使用的主题（后端 /api/public/theme/active 返回） */
export interface ActiveTheme {
  id: number
  name: string
  version: number
  /** 原始配置 JSON */
  tokens: ThemeConfig
  /** 后端生成的 CSS 变量字符串，前端直接注入 */
  css: string
}

/* ============================ 业务 DTO ============================ */

export type ArticleStatus = 'draft' | 'published' | 'private'
export type ArticleType = 'article' | 'page' | 'note'

/** 文章列表项 */
export interface ArticleItem {
  id: number
  title: string
  slug: string
  summary: string
  cover: string
  status: ArticleStatus
  type: ArticleType
  categoryId?: number
  categoryName?: string
  tags: TagItem[]
  isTop: boolean
  allowComment: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  wordCount: number
  readingTime: number
  publishedAt: string
  createdAt: string
  updatedAt: string
  /** 搜索结果命中的摘要片段（后端返回，纯文本） */
  highlight?: string
}

/** 文章详情 */
export interface ArticleDetail extends ArticleItem {
  /** 后端渲染好的 HTML（前台不再重复渲染 Markdown） */
  contentHtml: string
  contentMd: string
  /** 后端生成的目录（前台可直接使用） */
  toc?: { id: string; level: number; text: string }[]
  prev?: { title: string; slug: string } | null
  next?: { title: string; slug: string } | null
  related: ArticleItem[]
  /** 搜索命中的摘要片段 */
  highlight?: string
}

export interface CategoryItem {
  id: number
  name: string
  slug: string
  description: string
  parentId: number
  sort: number
  articleCount: number
  children?: CategoryItem[]
}

export interface TagItem {
  id: number
  name: string
  slug: string
  color: string
  articleCount?: number
}

export type CommentStatus = 'pending' | 'approved' | 'spam' | 'deleted'

export interface CommentItem {
  id: number
  articleId: number
  parentId: number
  authorName: string
  authorEmail: string
  authorSite: string
  authorAvatar: string
  content: string
  status: CommentStatus
  /** 后端返回 Integer 0/1 */
  isAdmin: number | boolean
  ip: string
  createdAt: string
  /** 文章标题（后台列表用） */
  articleTitle?: string
  articleSlug?: string
  /** 后端字段名：replies（一层回复） */
  replies?: CommentItem[]
  /** 前台组件消费的字段（由 API 层从 replies 归一化） */
  children?: CommentItem[]
}

export interface MediaItem {
  id: number
  fileName: string
  originalName: string
  url: string
  mimeType: string
  size: number
  width: number
  height: number
  folder: string
  /** 逻辑目录 ID，null/undefined 为未分组 */
  folderId?: number | null
  createdAt: string
}

/** 媒体目录树节点 */
export interface MediaFolderNode {
  id: number
  name: string
  parentId: number
  sort: number
  mediaCount: number
  children?: MediaFolderNode[]
}

export interface UserItem {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  role: 'admin' | 'author'
  status: number
  lastLoginAt: string
  createdAt: string
}

export interface SiteSettings {
  site_title: string
  site_subtitle: string
  site_logo: string
  site_favicon: string
  site_footer: string
  icp_no: string
  seo_keywords: string
  seo_desc: string
  comment_review_on: string
  page_size: string
  friend_links: string
  social_links: string
  [key: string]: string
}

/** 前台站点设置聚合（后端 SiteSettingsVO） */
export interface SiteSettingsVO {
  /** 原始 KV 配置 */
  settings: Record<string, string>
  friendLinks: FriendLink[]
  socialLinks: SocialLink[]
  commentReviewOn: boolean
  pageSize: number
}

export interface FriendLink {
  name: string
  url: string
  desc?: string
  avatar?: string
}

export interface SocialLink {
  name: string
  url: string
  icon?: string
}

/** 归档项（后端 ArchiveItemVO） */
export interface ArchiveItem {
  slug: string
  title: string
  /** yyyy-MM-dd */
  date: string
  publishedAt: string
}

/** 归档分组（后端 ArchiveGroupVO：按 yyyy-MM 聚合） */
export interface ArchiveGroup {
  /** yyyy-MM */
  month: string
  year: number
  count: number
  items: ArchiveItem[]
}

/** 按天统计（后端 DailyCountVO） */
export interface DailyCount {
  date: string
  count: number
}

/** 仪表盘统计（后端 DashboardStatsVO） */
export interface DashboardStats {
  articleCount: number
  publishedCount: number
  draftCount: number
  viewCount: number
  commentCount: number
  pendingCommentCount: number
  categoryCount: number
  tagCount: number
  userCount: number
  mediaCount: number
  articleTrend: DailyCount[]
  commentTrend: DailyCount[]
  topArticles: ArticleItem[]
  pendingComments: CommentItem[]
}

export interface OperationLogItem {
  id: number
  userId: number
  /** 后端 OperationLog 实体无 username，前端可选展示 */
  username?: string
  module: string
  action: string
  detail: string
  ip: string
  createdAt: string
}

/** 统一响应体 */
export interface R<T = any> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}
