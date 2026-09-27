import MarkdownIt from 'markdown-it'
import type {
  ArticleDetail,
  ArticleItem,
  CategoryItem,
  CommentItem,
  MediaItem,
  OperationLogItem,
  SiteSettings,
  TagItem,
  UserItem
} from '../types'
import { DEFAULT_THEME, themeCss, colorFromName } from '../index'

/** 简易 Markdown 渲染器（模拟后端渲染 content_html 的行为） */
const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false })

export function renderMarkdown(src: string): string {
  return md.render(src || '')
}

export const MOCK_SETTINGS: SiteSettings = {
  site_title: '墨笺 · 技术博客',
  site_subtitle: '写点什么，让思考留痕',
  site_logo: '',
  site_favicon: '',
  site_footer: '© 2026 墨笺博客 · 由动态主题博客系统驱动',
  icp_no: '京ICP备00000000号',
  seo_keywords: '博客,Vue3,Spring Boot,动态主题,前端工程化',
  seo_desc: '一个支持可视化动态主题配置的博客系统，前台样式完全由后台驱动。',
  comment_review_on: 'true',
  page_size: '10',
  friend_links: JSON.stringify([
    { name: 'Vue 官方文档', url: 'https://vuejs.org', desc: '渐进式 JavaScript 框架' },
    { name: 'Spring Boot', url: 'https://spring.io/projects/spring-boot', desc: '后端基座' },
    { name: 'MyBatis-Plus', url: 'https://baomidou.com', desc: 'ORM 增强工具' }
  ]),
  social_links: JSON.stringify([
    { name: 'GitHub', url: 'https://github.com', icon: 'github' },
    { name: '邮箱', url: 'mailto:hi@example.com', icon: 'mail' },
    { name: 'RSS', url: '/rss.xml', icon: 'rss' }
  ])
}

export const MOCK_USERS: (UserItem & { password: string })[] = [
  {
    id: 1,
    username: 'admin',
    nickname: '站长',
    avatar: '',
    email: 'admin@example.com',
    role: 'admin',
    status: 1,
    lastLoginAt: '2026-09-20 10:12:00',
    createdAt: '2025-01-01 09:00:00',
    password: '123456'
  },
  {
    id: 2,
    username: 'author',
    nickname: '特约作者',
    avatar: '',
    email: 'author@example.com',
    role: 'author',
    status: 1,
    lastLoginAt: '2026-09-18 21:30:00',
    createdAt: '2025-03-11 09:00:00',
    password: '123456'
  }
]

export const MOCK_CATEGORIES: CategoryItem[] = [
  { id: 1, name: '前端工程', slug: 'frontend', description: 'Vue/TS/构建工具', parentId: 0, sort: 1, articleCount: 0 },
  { id: 2, name: '后端架构', slug: 'backend', description: 'Java/Spring/分布式', parentId: 0, sort: 2, articleCount: 0 },
  { id: 3, name: '数据库', slug: 'database', description: 'MySQL/Redis', parentId: 2, sort: 1, articleCount: 0 },
  { id: 4, name: '运维部署', slug: 'devops', description: 'Docker/Nginx', parentId: 2, sort: 2, articleCount: 0 },
  { id: 5, name: '随笔', slug: 'notes', description: '生活与思考', parentId: 0, sort: 3, articleCount: 0 }
]

const TAG_NAMES = ['Vue3', 'TypeScript', 'Spring Boot', 'MySQL', 'Redis', 'Docker', '性能优化', '主题系统', 'CSS', 'Nginx', '随笔', '工具推荐']

export const MOCK_TAGS: TagItem[] = TAG_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  color: colorFromName(name),
  articleCount: 0
}))

/** 文章正文示例（含代码、表格、公式） */
function sampleContent(index: number): string {
  return `## 前言

这是第 ${index} 篇示例文章，用于演示 Markdown 渲染效果：**加粗**、*斜体*、~~删除线~~、[行内链接](https://vuejs.org)。

## 代码示例

\`\`\`ts
// 主题 token 转 CSS 变量
export function themeVars(cfg: ThemeConfig): Record<string, string> {
  return {
    '--color-primary': cfg.color.primary,
    '--space-unit': \`\${cfg.space.unit}px\`
  }
}
\`\`\`

## 表格

| 能力 | 前台 | 后台 |
| --- | --- | --- |
| 文章浏览 | 支持 | 支持 |
| 主题编辑 | 只读生效 | 可视化编辑 |
| 评论审核 | 提交 | 审核 |

## 数学公式

行内公式 $E = mc^2$，块级公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 引用与列表

> 所有前台样式只允许引用 CSS 变量，禁止硬编码色值。

1. 拉取主题配置
2. 注入 CSS 变量
3. 渲染页面内容

## 小结

本文由 Mock 数据生成，接入真实后端后内容来自 \`t_article.content_html\`。
`
}

const TITLES = [
  ['从零实现一套动态主题系统', 'frontend'],
  ['Vue3 + Vite 工程化最佳实践', 'frontend'],
  ['CSS 变量驱动的样式架构', 'frontend'],
  ['Spring Boot 3 接入 JWT 鉴权', 'backend'],
  ['MyBatis-Plus 分页与深分页优化', 'database'],
  ['MySQL 5.7 兼容性踩坑记录', 'database'],
  ['Redis 缓存穿透与雪崩应对', 'database'],
  ['Docker Compose 一键部署博客', 'devops'],
  ['Nginx 反代与静态资源缓存', 'devops'],
  ['Markdown 渲染与 XSS 过滤', 'backend'],
  ['写给自己的年度复盘', 'notes'],
  ['高效写作工具清单', 'notes']
]

function buildArticles(): ArticleItem[] {
  const list: ArticleItem[] = []
  const now = new Date('2026-09-20T10:00:00')
  TITLES.forEach((t, i) => {
    const [title, catSlug] = t
    const cat = MOCK_CATEGORIES.find((c) => c.slug === catSlug)!
    const tags = MOCK_TAGS.filter((_, ti) => (ti + i) % 5 === 0).slice(0, 2)
    const contentMd = sampleContent(i + 1)
    const wordCount = contentMd.replace(/\s/g, '').length
    const published = new Date(now.getTime() - i * 12 * 86400000)
    const item: ArticleItem = {
      id: 100 + i,
      title,
      slug: `${catSlug}-${i + 1}-${title.slice(0, 4)}`,
      summary: `${title} —— 本文围绕该主题展开，介绍设计思路、实现细节与线上效果，示例完整可运行。`,
      cover: i % 3 === 0 ? `https://picsum.photos/seed/blog${i}/960/420` : '',
      status: 'published',
      type: 'article',
      categoryId: cat.id,
      categoryName: cat.name,
      tags,
      isTop: i === 0,
      allowComment: true,
      viewCount: 1200 - i * 37,
      likeCount: 120 - i * 3,
      commentCount: (i % 4) + 1,
      wordCount,
      readingTime: Math.max(1, Math.round(wordCount / 350)),
      publishedAt: formatDate(published),
      createdAt: formatDate(new Date(published.getTime() - 86400000)),
      updatedAt: formatDate(published)
    }
    list.push(item)
  })
  // 两篇自定义页面 + 一篇草稿
  list.push({
    id: 200,
    title: '关于我',
    slug: 'about',
    summary: '一名混迹于前后端的工程师',
    cover: '',
    status: 'published',
    type: 'page',
    tags: [],
    isTop: false,
    allowComment: true,
    viewCount: 320,
    likeCount: 12,
    commentCount: 0,
    wordCount: 800,
    readingTime: 3,
    publishedAt: '2025-06-01 10:00:00',
    createdAt: '2025-06-01 10:00:00',
    updatedAt: '2025-06-01 10:00:00'
  })
  list.push({
    id: 201,
    title: '友情链接',
    slug: 'links',
    summary: '一些值得逛的站点',
    cover: '',
    status: 'published',
    type: 'page',
    tags: [],
    isTop: false,
    allowComment: false,
    viewCount: 90,
    likeCount: 2,
    commentCount: 0,
    wordCount: 300,
    readingTime: 1,
    publishedAt: '2025-06-02 10:00:00',
    createdAt: '2025-06-02 10:00:00',
    updatedAt: '2025-06-02 10:00:00'
  })
  list.push({
    id: 202,
    title: '（草稿）未完成的主题市场设计',
    slug: 'theme-market-draft',
    summary: '草稿，前台不可见',
    cover: '',
    status: 'draft',
    type: 'article',
    categoryId: 1,
    categoryName: '前端工程',
    tags: [MOCK_TAGS[0]],
    isTop: false,
    allowComment: true,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    wordCount: 500,
    readingTime: 2,
    publishedAt: '',
    createdAt: '2026-09-19 10:00:00',
    updatedAt: '2026-09-19 10:00:00'
  })
  return list
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const MOCK_ARTICLES: ArticleItem[] = buildArticles()

/** 文章正文（md + 后端渲染 html） */
const CONTENT: Record<number, { md: string; html: string }> = {}
MOCK_ARTICLES.forEach((a, i) => {
  const mdText =
    a.type === 'page'
      ? `# ${a.title}\n\n${a.summary}\n\n- 喜欢折腾前后端\n- 偶尔写点教程\n- 联系方式：hi@example.com\n`
      : sampleContent(i + 1)
  CONTENT[a.id] = { md: mdText, html: renderMarkdown(mdText) }
})

export function getArticleContent(id: number) {
  return CONTENT[id] || { md: '', html: '' }
}

export function toDetail(a: ArticleItem): ArticleDetail {
  const content = getArticleContent(a.id)
  return { ...a, contentMd: content.md, contentHtml: content.html, related: [], prev: null, next: null }
}

export const MOCK_COMMENTS: CommentItem[] = [
  mkComment(1, 100, 0, '林深', '写得真好，主题系统那段受教了', 'approved'),
  mkComment(2, 100, 1, '站长', '谢谢支持，后续会补充主题市场的实现。', 'approved', true),
  mkComment(3, 101, 0, '阿泽', '请问 Vite 5 的配置有完整示例吗？', 'approved'),
  mkComment(4, 102, 0, '某广告哥', '低价出售各类流量，联系VX…', 'spam'),
  mkComment(5, 103, 0, 'Kael', 'JWT 那段能否加一下刷新令牌的说明', 'pending'),
  mkComment(6, 104, 0, '小满', '深分页优化实测有效，点赞', 'approved'),
  mkComment(7, 105, 0, '路人甲', '收藏了，慢慢看', 'approved'),
  mkComment(8, 106, 0, 'เซิน', 'This is a test comment', 'pending')
]

function mkComment(
  id: number,
  articleId: number,
  parentId: number,
  authorName: string,
  content: string,
  status: CommentItem['status'],
  isAdmin = false
): CommentItem {
  return {
    id,
    articleId,
    parentId,
    authorName,
    authorEmail: `${authorName}@example.com`,
    authorSite: '',
    authorAvatar: '',
    content,
    status,
    ip: `112.94.${id * 7}.${id * 13}`,
    isAdmin,
    createdAt: `2026-09-${String(10 + (id % 9)).padStart(2, '0')} 1${id}:20:0${id % 9}`
  }
}

/** 媒体逻辑目录（与后端 t_media_folder 同构：parentId=0 为一级目录） */
export const MOCK_MEDIA_FOLDERS: { id: number; name: string; parentId: number; sort: number }[] = [
  { id: 1, name: 'default', parentId: 0, sort: 0 },
  { id: 2, name: 'cover', parentId: 0, sort: 1 }
]

export const MOCK_MEDIA: MediaItem[] = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  fileName: `media-${i + 1}.jpg`,
  originalName: `示例图片-${i + 1}.jpg`,
  url: `https://picsum.photos/seed/media${i + 1}/600/400`,
  mimeType: 'image/jpeg',
  size: 1024 * (120 + i * 37),
  width: 600,
  height: 400,
  folder: i % 3 === 0 ? 'cover' : 'default',
  /** 对齐后端：媒体归入具体目录 */
  folderId: i % 3 === 0 ? 2 : 1,
  createdAt: `2026-08-${String(1 + i).padStart(2, '0')} 10:00:00`
}))

export const MOCK_LOGS: OperationLogItem[] = Array.from({ length: 20 }).map((_, i) => ({
  id: i + 1,
  userId: i % 2 === 0 ? 1 : 2,
  username: i % 2 === 0 ? 'admin' : 'author',
  module: ['article', 'theme', 'comment', 'media', 'setting'][i % 5],
  action: ['新增', '修改', '删除', '发布', '启用'][i % 5],
  detail: `操作对象 #${100 + i}`,
  ip: `192.168.1.${i + 2}`,
  createdAt: `2026-09-${String(1 + (i % 20)).padStart(2, '0')} 0${i % 9}:3${i % 6}:00`
}))

export interface MockThemeRecord {
  id: number
  name: string
  description: string
  config: any
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export const MOCK_THEMES: MockThemeRecord[] = [
  {
    id: 1,
    name: '默认主题',
    description: '站点当前生效的主题',
    config: DEFAULT_THEME,
    isActive: true,
    version: 1,
    createdAt: '2026-01-01 09:00:00',
    updatedAt: '2026-09-01 09:00:00'
  }
]

export function activeThemePayload() {
  const t = MOCK_THEMES.find((x) => x.isActive) || MOCK_THEMES[0]
  return {
    id: t.id,
    name: t.name,
    version: t.version,
    tokens: t.config,
    css: themeCss(t.config)
  }
}

/** 重新计算分类/标签下的文章数 */
export function recalcCounts() {
  MOCK_CATEGORIES.forEach((c) => {
    c.articleCount = MOCK_ARTICLES.filter((a) => a.categoryId === c.id && a.status === 'published').length
  })
  MOCK_TAGS.forEach((t) => {
    t.articleCount = MOCK_ARTICLES.filter(
      (a) => a.tags?.some((x) => x.id === t.id) && a.status === 'published'
    ).length
  })
}
recalcCounts()
