import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  MOCK_ARTICLES,
  MOCK_CATEGORIES,
  MOCK_COMMENTS,
  MOCK_LOGS,
  MOCK_MEDIA,
  MOCK_MEDIA_FOLDERS,
  MOCK_SETTINGS,
  MOCK_TAGS,
  MOCK_THEMES,
  MOCK_USERS,
  activeThemePayload,
  recalcCounts,
  toDetail,
  getArticleContent,
  setArticleContent
} from './data'
import { themeCss } from '../theme/css'
import { THEME_PRESETS } from '../theme/presets'
import type { ArticleItem, MediaFolderNode } from '../types'

/**
 * 开发期 Mock 服务：在 Vite dev server 中直接挂载 /api/** 路由。
 * 目的：前端工程可独立运行与联调（后端就绪后把 VITE_USE_MOCK 置为 false 即走真实接口）。
 */

const TOKEN_PREFIX = 'mock-token-'

/** 图形验证码存储（key → code，一次性） */
const CAPTCHA_STORE = new Map<string, string>()

/** 分片上传任务：uploadId → 已写入分片序号 */
const CHUNK_STORE = new Map<string, number[]>()

/** 由扁平目录表构建树并回填各目录媒体数（与后端 MediaFolderService#tree 同构） */
function buildFolderTree(): MediaFolderNode[] {
  const countOf = (id: number) => MOCK_MEDIA.filter((m) => m.folderId === id).length
  const nodes: MediaFolderNode[] = MOCK_MEDIA_FOLDERS.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    sort: f.sort,
    mediaCount: countOf(f.id),
    children: []
  }))
  const map = new Map(nodes.map((n) => [n.id, n]))
  const roots: MediaFolderNode[] = []
  nodes.forEach((n) => {
    const parent = n.parentId && n.parentId !== 0 ? map.get(n.parentId) : undefined
    if (parent) parent.children!.push(n)
    else roots.push(n)
  })
  const sortRec = (list: MediaFolderNode[]) => {
    list.sort((a, b) => a.sort - b.sort)
    list.forEach((n) => sortRec(n.children || []))
  }
  sortRec(roots)
  return roots
}

/** 解析上传目标目录：folderId 优先，其次按 folder 名称回退到首个目录 */
function resolveFolder(folderIdRaw: any, folderNameRaw: any) {
  let folderId = Number(folderIdRaw)
  if (!Number.isFinite(folderId) || folderId <= 0) {
    const byName = folderNameRaw ? MOCK_MEDIA_FOLDERS.find((f) => f.name === folderNameRaw) : undefined
    folderId = byName ? byName.id : MOCK_MEDIA_FOLDERS[0].id
  }
  const folder = MOCK_MEDIA_FOLDERS.find((f) => f.id === folderId)?.name || String(folderNameRaw || 'default')
  return { folderId, folder }
}

/** 读取原始请求体（multipart 等非 JSON 场景使用） */
function readRaw(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => resolve(raw))
  })
}

function json(res: ServerResponse, data: any, code = 0, message = 'ok') {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ code, message, data }))
}

function fail(res: ServerResponse, message: string, code = 500, http = 200) {
  res.statusCode = http
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ code, message, data: null }))
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
  })
}

function paginate<T>(list: T[], page: number, size: number) {
  const total = list.length
  const start = (page - 1) * size
  return { list: list.slice(start, start + size), total, page, size }
}

function num(v: any, def: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : def
}

function authUser(req: IncomingMessage) {
  const header = (req.headers.authorization || '') as string
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7)
  if (!token.startsWith(TOKEN_PREFIX)) return null
  const username = token.slice(TOKEN_PREFIX.length)
  return MOCK_USERS.find((u) => u.username === username) || null
}

/** 文章查询：状态/关键词/分类/标签/排序 */
function queryArticles(q: Record<string, string>): ArticleItem[] {
  const keyword = (q.keyword || '').trim().toLowerCase()
  const categoryId = num(q.categoryId, 0)
  const tagId = num(q.tagId, 0)
  const type = q.type || ''
  const status = q.status || ''
  const sort = q.sort || 'latest'

  let list = MOCK_ARTICLES.filter((a) => {
    if (type && a.type !== type) return false
    if (status) {
      if (status !== a.status) return false
    } else if (a.status !== 'published') return false
    if (categoryId && a.categoryId !== categoryId) return false
    if (tagId && !a.tags?.some((t) => t.id === tagId)) return false
    if (keyword) {
      const hit =
        a.title.toLowerCase().includes(keyword) ||
        a.summary.toLowerCase().includes(keyword) ||
        getArticleContent(a.id).md.toLowerCase().includes(keyword)
      if (!hit) return false
    }
    return true
  })

  list = [...list].sort((a, b) => {
    if (sort === 'hot') return b.viewCount - a.viewCount
    if (sort === 'title') return a.title.localeCompare(b.title)
    return (b.publishedAt || '').localeCompare(a.publishedAt || '')
  })
  // 置顶优先
  return [...list].sort((a, b) => Number(b.isTop) - Number(a.isTop))
}

function articleDetail(slug: string) {
  const idx = MOCK_ARTICLES.findIndex((a) => a.slug === slug)
  if (idx < 0) return null
  const cur = MOCK_ARTICLES[idx]
  const published = MOCK_ARTICLES.filter((a) => a.type === 'article' && a.status === 'published')
  const pos = published.findIndex((a) => a.id === cur.id)
  const detail = toDetail(cur)
  detail.prev = pos > 0 ? { title: published[pos - 1].title, slug: published[pos - 1].slug } : null
  detail.next =
    pos >= 0 && pos < published.length - 1
      ? { title: published[pos + 1].title, slug: published[pos + 1].slug }
      : null
  detail.related = published.filter((a) => a.id !== cur.id && a.categoryId === cur.categoryId).slice(0, 4)
  return detail
}

/** 与后端 ArchiveGroupVO 对齐：按 yyyy-MM 聚合 {month, year, count, items} */
function archives() {
  const map = new Map<string, ArticleItem[]>()
  MOCK_ARTICLES.filter((a) => a.status === 'published' && a.publishedAt).forEach((a) => {
    const d = new Date(a.publishedAt.replace(/-/g, '/'))
    const p = (n: number) => String(n).padStart(2, '0')
    const month = `${d.getFullYear()}-${p(d.getMonth() + 1)}`
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(a)
  })
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, items]) => ({
      month,
      year: Number(month.slice(0, 4)),
      count: items.length,
      items: [...items]
        .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
        .map((a) => ({
          slug: a.slug,
          title: a.title,
          date: (a.publishedAt || '').slice(0, 10),
          publishedAt: a.publishedAt
        }))
    }))
}

/** 与后端 SiteSettingsVO 对齐：settings KV + 友链/社交/评论策略/页大小 */
function siteSettingsVO() {
  const parse = <T>(raw: string): T[] => {
    try {
      const v = JSON.parse(raw || '[]')
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }
  return {
    settings: MOCK_SETTINGS,
    friendLinks: parse(MOCK_SETTINGS.friend_links),
    socialLinks: parse(MOCK_SETTINGS.social_links),
    commentReviewOn: MOCK_SETTINGS.comment_review_on !== 'false',
    pageSize: Number(MOCK_SETTINGS.page_size) || 10
  }
}

/** 与后端 DashboardStatsVO 对齐 */
function dashboardStats() {
  const published = MOCK_ARTICLES.filter((a) => a.status === 'published')
  const series = (base: number, phase: number) =>
    Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(2026, 8, 20)
      d.setDate(d.getDate() - (29 - i))
      const p = (n: number) => String(n).padStart(2, '0')
      return {
        date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
        count: base + Math.round(Math.abs(Math.sin(i / 2.2 + phase)) * base * 3)
      }
    })
  return {
    articleCount: MOCK_ARTICLES.length,
    publishedCount: published.length,
    draftCount: MOCK_ARTICLES.filter((a) => a.status === 'draft').length,
    viewCount: published.reduce((s, a) => s + a.viewCount, 0),
    commentCount: MOCK_COMMENTS.filter((c) => c.status === 'approved').length,
    pendingCommentCount: MOCK_COMMENTS.filter((c) => c.status === 'pending').length,
    categoryCount: MOCK_CATEGORIES.length,
    tagCount: MOCK_TAGS.length,
    userCount: MOCK_USERS.length,
    mediaCount: MOCK_MEDIA.length,
    articleTrend: series(60, 0),
    commentTrend: series(4, 1.3),
    topArticles: [...published].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10),
    pendingComments: MOCK_COMMENTS.filter((c) => c.status === 'pending')
  }
}

export function createMockApiPlugin(options: { webOrigin?: string } = {}): Plugin {
  const webOrigin = options.webOrigin || 'http://localhost:5173'

  return {
    name: 'blog-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || ''
        if (!url.startsWith('/api/')) return next()
        const u = new URL(url, webOrigin)
        const path = u.pathname.replace(/\/+$/, '') || '/'
        const q: Record<string, string> = {}
        u.searchParams.forEach((v, k) => (q[k] = v))
        const method = (req.method || 'GET').toUpperCase()

        /* ==================== 公开接口 ==================== */
        if (path === '/api/public/theme/active' && method === 'GET') {
          return json(res, activeThemePayload())
        }
        if (path === '/api/public/theme/preview' && method === 'GET') {
          // 预览令牌：Mock 环境直接返回当前主题
          return json(res, activeThemePayload())
        }
        if (path === '/api/public/settings' && method === 'GET') {
          return json(res, siteSettingsVO())
        }
        if (path === '/api/public/bootstrap' && method === 'GET') {
          return json(res, {
            theme: activeThemePayload(),
            settings: siteSettingsVO(),
            serverTime: new Date().toISOString()
          })
        }
        if (path === '/api/public/articles' && method === 'GET') {
          const page = num(q.page, 1)
          const size = num(q.size, Number(MOCK_SETTINGS.page_size) || 10)
          const filtered = queryArticles(q)
          // 分页后的文章补充正文摘要字段
          const result = paginate(filtered, page, size)
          return json(res, result)
        }
        if (/^\/api\/public\/articles\/[^/]+$/.test(path) && method === 'GET') {
          const slug = decodeURIComponent(path.split('/').pop()!)
          const detail = articleDetail(slug)
          if (!detail) return fail(res, '文章不存在', 404)
          return json(res, detail)
        }
        // 自定义页面（关于 / 友链等 type=page）
        if (/^\/api\/public\/pages\/[^/]+$/.test(path) && method === 'GET') {
          const raw = decodeURIComponent(path.split('/').pop()!)
          const found = MOCK_ARTICLES.find(
            (a) => a.type === 'page' && (a.slug === raw || String(a.id) === raw)
          )
          if (!found || found.status !== 'published') return fail(res, '页面不存在', 404)
          return json(res, toDetail(found))
        }
        // 点赞：返回最新点赞数
        if (/^\/api\/public\/articles\/[^/]+\/like$/.test(path) && method === 'POST') {
          const raw = decodeURIComponent(path.split('/')[4])
          const found = MOCK_ARTICLES.find((a) => String(a.id) === raw || a.slug === raw)
          if (!found) return fail(res, '文章不存在', 404)
          found.likeCount = (found.likeCount || 0) + 1
          return json(res, found.likeCount)
        }
        // 评论列表：支持 idOrSlug，返回分页 + replies（与后端一致）
        if (/^\/api\/public\/articles\/[^/]+\/comments$/.test(path) && method === 'GET') {
          const raw = decodeURIComponent(path.split('/')[4])
          const found = MOCK_ARTICLES.find((a) => String(a.id) === raw || a.slug === raw)
          if (!found) return fail(res, '文章不存在', 404)
          const approved = MOCK_COMMENTS.filter((c) => c.articleId === found.id && c.status === 'approved')
          const roots = approved.filter((c) => !c.parentId)
          const page = num(q.page, 1)
          const size = num(q.size, 20)
          const result = paginate(roots, page, size)
          return json(res, {
            ...result,
            list: result.list.map((c) => ({
              ...c,
              replies: approved.filter((x) => x.parentId === c.id)
            }))
          })
        }
        if (path === '/api/public/comments' && method === 'POST') {
          const body = await readBody(req)
          const raw = String(body.articleId ?? body.articleIdOrSlug ?? '')
          const target = MOCK_ARTICLES.find((a) => String(a.id) === raw || a.slug === raw)
          if (!target) return fail(res, '文章不存在', 404)
          const id = Math.max(...MOCK_COMMENTS.map((c) => c.id)) + 1
          MOCK_COMMENTS.push({
            id,
            articleId: target.id,
            parentId: Number(body.parentId || 0),
            authorName: body.authorName || '匿名',
            authorEmail: body.authorEmail || '',
            authorSite: body.authorSite || '',
            authorAvatar: '',
            content: body.content || '',
            status: MOCK_SETTINGS.comment_review_on === 'false' ? 'approved' : 'pending',
            ip: '127.0.0.1',
            isAdmin: false,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          })
          return json(res, { id })
        }
        if (path === '/api/public/categories' && method === 'GET') {
          recalcCounts()
          const roots = MOCK_CATEGORIES.filter((c) => c.parentId === 0).map((c) => ({
            ...c,
            children: MOCK_CATEGORIES.filter((x) => x.parentId === c.id)
          }))
          return json(res, roots)
        }
        if (path === '/api/public/tags' && method === 'GET') {
          recalcCounts()
          return json(res, [...MOCK_TAGS].sort((a, b) => (b.articleCount || 0) - (a.articleCount || 0)))
        }
        if (path === '/api/public/archives' && method === 'GET') {
          return json(res, archives())
        }
        if (path === '/api/public/search' && method === 'GET') {
          const kw = (q.q || q.keyword || '').trim()
          if (!kw) return json(res, { list: [], total: 0, page: 1, size: 10 })
          const k = kw.toLowerCase()
          const hits = MOCK_ARTICLES.filter((a) => a.status === 'published').filter(
            (a) =>
              a.title.toLowerCase().includes(k) ||
              a.summary.toLowerCase().includes(k) ||
              getArticleContent(a.id).md.toLowerCase().includes(k)
          )
          const page = num(q.page, 1)
          const size = num(q.size, 10)
          return json(res, paginate(hits, page, size))
        }
        if (path === '/api/public/sitemap.xml' && method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          const urls = MOCK_ARTICLES.filter((a) => a.status === 'published')
            .map((a) => `  <url><loc>${new URL(`/posts/${a.slug}`, webOrigin).toString()}</loc></url>`)
            .join('\n')
          res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`)
          return
        }

        /* ==================== 管理接口 ==================== */
        if (path === '/api/admin/auth/captcha' && method === 'GET') {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXY345678'
          const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
          const key = `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          CAPTCHA_STORE.set(key, code)
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#f2f5ff"/>${code
            .split('')
            .map((c, i) => `<text x="${14 + i * 26}" y="28" font-size="24" font-family="Georgia" fill="#3730a3">${c}</text>`)
            .join('')}</svg>`
          return json(res, {
            captchaKey: key,
            captchaImage: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
            expiresIn: 300
          })
        }
        if (path === '/api/admin/auth/logout' && method === 'POST') {
          return json(res, null)
        }
        if (path === '/api/admin/auth/login' && method === 'POST') {
          const body = await readBody(req)
          // 校验图形验证码（真实后端由 CaptchaService 校验）
          if (body.captchaKey) {
            const expected = CAPTCHA_STORE.get(String(body.captchaKey))
            CAPTCHA_STORE.delete(String(body.captchaKey))
            if (!expected || String(body.captchaCode || '').toUpperCase() !== expected) {
              return fail(res, '验证码不正确或已过期', 401)
            }
          }
          const user = MOCK_USERS.find(
            (u) => u.username === body.username && (u.password === body.password || body.password === '123456')
          )
          if (!user) return fail(res, '用户名或密码错误', 401)
          const { password, ...rest } = user
          void password
          // 与后端 LoginResponse 对齐：原始 token + tokenType
          return json(res, {
            token: `${TOKEN_PREFIX}${user.username}`,
            tokenType: 'Bearer',
            expiresIn: 43200,
            user: rest
          })
        }
        if (path === '/api/admin/auth/profile' && method === 'GET') {
          const user = authUser(req)
          if (!user) return fail(res, '未登录', 401)
          const { password, ...rest } = user
          void password
          return json(res, rest)
        }

        // 以下管理接口均需鉴权
        const guardPath = path.startsWith('/api/admin/') && path !== '/api/admin/auth/login'
        const currentUser = authUser(req)
        if (guardPath && !currentUser) return fail(res, '未登录或令牌失效', 401)
        if (guardPath && path.startsWith('/api/admin/users') && currentUser?.role !== 'admin') {
          return fail(res, '无权限', 403)
        }

        if (path === '/api/admin/dashboard/stats' && method === 'GET') {
          return json(res, dashboardStats())
        }

        /* ------- 文章 ------- */
        if (path === '/api/admin/articles' && method === 'GET') {
          const page = num(q.page, 1)
          const size = num(q.size, 10)
          const qq = { ...q }
          if (q.status) qq.status = q.status
          else qq.status = 'all'
          const list = queryArticles({ ...qq, status: qq.status === 'all' ? '' : qq.status })
          return json(res, paginate(list, page, size))
        }
        if (/^\/api\/admin\/articles\/\d+$/.test(path) && method === 'GET') {
          const id = Number(path.split('/').pop())
          const a = MOCK_ARTICLES.find((x) => x.id === id)
          if (!a) return fail(res, '文章不存在', 404)
          return json(res, toDetail(a))
        }
        if (path === '/api/admin/articles' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_ARTICLES.map((a) => a.id)) + 1
          const item: ArticleItem = {
            id,
            title: body.title || '未命名',
            slug: body.slug || `post-${id}`,
            summary: body.summary || '',
            cover: body.cover || '',
            status: body.status || 'draft',
            type: body.type || 'article',
            categoryId: body.categoryId,
            categoryName: MOCK_CATEGORIES.find((c) => c.id === body.categoryId)?.name,
            tags: MOCK_TAGS.filter((t) => (body.tagIds || []).includes(t.id)),
            isTop: !!body.isTop,
            allowComment: body.allowComment !== false,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            wordCount: (body.contentMd || '').replace(/\s/g, '').length,
            readingTime: Math.max(1, Math.round((body.contentMd || '').replace(/\s/g, '').length / 350)),
            publishedAt: body.status === 'published' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : '',
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_ARTICLES.unshift(item)
          recalcCounts()
          return json(res, item)
        }
        if (/^\/api\/admin\/articles\/\d+$/.test(path) && method === 'PUT') {
          const id = Number(path.split('/').pop())
          const idx = MOCK_ARTICLES.findIndex((a) => a.id === id)
          if (idx < 0) return fail(res, '文章不存在', 404)
          const body = await readBody(req)
          const old = MOCK_ARTICLES[idx]
          const next: ArticleItem = {
            ...old,
            ...body,
            tags: body.tagIds ? MOCK_TAGS.filter((t) => body.tagIds.includes(t.id)) : old.tags,
            categoryName: MOCK_CATEGORIES.find((c) => c.id === (body.categoryId ?? old.categoryId))?.name,
            wordCount: (body.contentMd ?? '').replace(/\s/g, '').length || old.wordCount,
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_ARTICLES[idx] = next
          recalcCounts()
          return json(res, next)
        }
        if (/^\/api\/admin\/articles\/\d+$/.test(path) && method === 'DELETE') {
          const id = Number(path.split('/').pop())
          const idx = MOCK_ARTICLES.findIndex((a) => a.id === id)
          if (idx >= 0) MOCK_ARTICLES.splice(idx, 1)
          recalcCounts()
          return json(res, true)
        }
        if (/^\/api\/admin\/articles\/\d+\/(publish|top)$/.test(path) && method === 'POST') {
          const parts = path.split('/')
          const id = Number(parts[4])
          const action = parts[5]
          const a = MOCK_ARTICLES.find((x) => x.id === id)
          if (!a) return fail(res, '文章不存在', 404)
          if (action === 'publish') {
            const publish = q.publish !== 'false'
            a.status = publish ? 'published' : 'draft'
            a.publishedAt = publish ? new Date().toISOString().slice(0, 19).replace('T', ' ') : ''
          } else {
            a.isTop = q.top !== 'false'
          }
          recalcCounts()
          return json(res, null)
        }
        if (path === '/api/admin/articles/batch/delete' && method === 'POST') {
          const body = await readBody(req)
          for (const id of body.ids || []) {
            const idx = MOCK_ARTICLES.findIndex((a) => a.id === id)
            if (idx >= 0) MOCK_ARTICLES.splice(idx, 1)
          }
          recalcCounts()
          return json(res, (body.ids || []).length)
        }
        if (/^\/api\/admin\/articles\/\d+\/export$/.test(path) && method === 'GET') {
          const id = Number(path.split('/')[4])
          const a = MOCK_ARTICLES.find((x) => x.id === id)
          if (!a) return fail(res, '文章不存在', 404)
          const { md } = getArticleContent(id)
          const frontMatter = [
            '---',
            `title: ${a.title}`,
            `slug: ${a.slug}`,
            a.summary ? `summary: ${a.summary}` : '',
            `status: ${a.status}`,
            a.categoryName ? `category: ${a.categoryName}` : '',
            a.tags?.length ? `tags: [${a.tags.map((t) => t.name).join(', ')}]` : '',
            `created_at: ${a.createdAt}`,
            '---',
            ''
          ]
            .filter(Boolean)
            .join('\n')
          return json(res, { markdown: `${frontMatter}${md}` })
        }
        if (path === '/api/admin/articles/import' && method === 'POST') {
          // multipart：解析出文件名与 Markdown 正文（前端以 file 字段提交）
          const raw = await readRaw(req)
          const nameMatch = /filename="([^"]+)"/.exec(raw)
          const fileName = nameMatch ? nameMatch[1] : 'imported.md'
          const headEnd = raw.indexOf('\r\n\r\n')
          let md = headEnd >= 0 ? raw.slice(headEnd + 4) : ''
          const boundary = /^--([^\r\n]+)/.exec(raw)?.[1]
          if (boundary) md = md.replace(new RegExp(`--${boundary}[\\s\\S]*$`), '')
          const status = (q.status || 'draft') as ArticleItem['status']
          const id = Math.max(...MOCK_ARTICLES.map((a) => a.id)) + 1
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
          const article = {
            ...MOCK_ARTICLES[0],
            id,
            title: fileName.replace(/\.md$/i, '') || `导入文章 ${id}`,
            slug: `imported-${id}`,
            summary: md.replace(/[#>*`\-]/g, '').trim().slice(0, 120),
            cover: '',
            status,
            categoryId: 0,
            categoryName: '未分类',
            tags: [],
            authorId: currentUser?.id ?? 1,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            wordCount: md.replace(/\s/g, '').length,
            isTop: false,
            allowComment: true,
            publishedAt: status === 'published' ? now : '',
            createdAt: now,
            updatedAt: now
          }
          MOCK_ARTICLES.push(article)
          setArticleContent(id, md)
          recalcCounts()
          return json(res, { id })
        }

        /* ------- 分类 / 标签 ------- */
        if (path === '/api/admin/categories' && method === 'GET') {
          recalcCounts()
          return json(res, MOCK_CATEGORIES)
        }
        if (path === '/api/admin/categories' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_CATEGORIES.map((c) => c.id)) + 1
          const item = {
            id,
            name: body.name,
            slug: body.slug || `cat-${id}`,
            description: body.description || '',
            parentId: Number(body.parentId || 0),
            sort: Number(body.sort || 99),
            articleCount: 0
          }
          MOCK_CATEGORIES.push(item)
          return json(res, item)
        }
        if (/^\/api\/admin\/categories\/\d+$/.test(path) && (method === 'PUT' || method === 'DELETE')) {
          const id = Number(path.split('/').pop())
          const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id)
          if (idx < 0) return fail(res, '分类不存在', 404)
          if (method === 'DELETE') {
            MOCK_CATEGORIES.splice(idx, 1)
            return json(res, true)
          }
          const body = await readBody(req)
          MOCK_CATEGORIES[idx] = { ...MOCK_CATEGORIES[idx], ...body }
          return json(res, MOCK_CATEGORIES[idx])
        }
        if (path === '/api/admin/categories/sort' && method === 'PUT') {
          // 请求体为 id 数组，按传入顺序重算 sort
          const ids: number[] = (await readBody(req)) || []
          ids.forEach((cid, i) => {
            const c = MOCK_CATEGORIES.find((x) => x.id === cid)
            if (c) c.sort = i + 1
          })
          recalcCounts()
          return json(res, null)
        }
        if (path === '/api/admin/tags' && method === 'GET') {
          recalcCounts()
          return json(res, MOCK_TAGS)
        }
        if (path === '/api/admin/tags' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_TAGS.map((t) => t.id)) + 1
          const item = {
            id,
            name: body.name,
            slug: body.slug || `tag-${id}`,
            color: body.color || '#4f46e5',
            articleCount: 0
          }
          MOCK_TAGS.push(item)
          return json(res, item)
        }
        if (/^\/api\/admin\/tags\/\d+$/.test(path) && (method === 'PUT' || method === 'DELETE')) {
          const id = Number(path.split('/').pop())
          const idx = MOCK_TAGS.findIndex((t) => t.id === id)
          if (idx < 0) return fail(res, '标签不存在', 404)
          if (method === 'DELETE') {
            MOCK_TAGS.splice(idx, 1)
            return json(res, true)
          }
          const body = await readBody(req)
          MOCK_TAGS[idx] = { ...MOCK_TAGS[idx], ...body }
          return json(res, MOCK_TAGS[idx])
        }
        if (path === '/api/admin/tags/merge' && method === 'POST') {
          // sourceId 下的文章全部迁移到 targetId，随后删除 sourceId
          const body = await readBody(req)
          const source = MOCK_TAGS.find((t) => t.id === Number(body.sourceId))
          const target = MOCK_TAGS.find((t) => t.id === Number(body.targetId))
          if (!source || !target) return fail(res, '标签不存在', 404)
          MOCK_ARTICLES.forEach((a) => {
            if (!a.tags?.some((t) => t.id === source.id)) return
            const hasTarget = a.tags.some((t) => t.id === target.id)
            a.tags = hasTarget
              ? a.tags.filter((t) => t.id !== source.id)
              : a.tags.map((t) => (t.id === source.id ? { ...target } : t))
          })
          MOCK_TAGS.splice(MOCK_TAGS.indexOf(source), 1)
          recalcCounts()
          return json(res, null)
        }

        /* ------- 评论 ------- */
        if (path === '/api/admin/comments' && method === 'GET') {
          const status = q.status || ''
          let list = MOCK_COMMENTS
          if (status) list = list.filter((c) => c.status === status)
          return json(res, paginate([...list].reverse(), num(q.page, 1), num(q.size, 10)))
        }
        if (/^\/api\/admin\/comments\/\d+\/(approve|reject)$/.test(path) && method === 'PUT') {
          const parts = path.split('/')
          const id = Number(parts[4])
          const action = parts[5]
          const c = MOCK_COMMENTS.find((x) => x.id === id)
          if (!c) return fail(res, '评论不存在', 404)
          c.status = action === 'approve' ? 'approved' : 'spam'
          return json(res, null)
        }
        if (/^\/api\/admin\/comments\/\d+$/.test(path) && (method === 'PUT' || method === 'DELETE')) {
          const id = Number(path.split('/').pop())
          const c = MOCK_COMMENTS.find((x) => x.id === id)
          if (!c) return fail(res, '评论不存在', 404)
          if (method === 'DELETE') {
            c.status = 'deleted'
            return json(res, null)
          }
          const body = await readBody(req)
          Object.assign(c, body)
          return json(res, c)
        }
        if (path === '/api/admin/comments/batch/approve' && method === 'POST') {
          const body = await readBody(req)
          MOCK_COMMENTS.filter((c) => (body.ids || []).includes(c.id)).forEach((c) => (c.status = 'approved'))
          return json(res, null)
        }
        if (path === '/api/admin/comments/batch/delete' && method === 'POST') {
          const body = await readBody(req)
          MOCK_COMMENTS.filter((c) => (body.ids || []).includes(c.id)).forEach((c) => (c.status = 'deleted'))
          return json(res, (body.ids || []).length)
        }
        if (path === '/api/admin/comments/reply' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_COMMENTS.map((c) => c.id)) + 1
          const reply = {
            id,
            articleId: Number(body.articleId),
            parentId: Number(body.parentId || 0),
            authorName: '站长',
            authorEmail: 'admin@example.com',
            authorSite: '',
            authorAvatar: '',
            content: body.content || '',
            status: 'approved' as const,
            ip: '127.0.0.1',
            isAdmin: true,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_COMMENTS.push(reply)
          return json(res, reply)
        }

        /* ------- 媒体库 ------- */
        if (path === '/api/admin/media/folders' && method === 'GET') {
          return json(res, Array.from(new Set(MOCK_MEDIA.map((m) => m.folder || 'default'))))
        }
        if (path === '/api/admin/media' && method === 'GET') {
          // folderId：不传=全部，0=未分组，>0=指定目录（与后端一致）
          const folderId = q.folderId !== undefined && q.folderId !== '' ? Number(q.folderId) : undefined
          const keyword = (q.keyword || '').trim().toLowerCase()
          let list = MOCK_MEDIA
          if (folderId !== undefined) {
            list = folderId === 0 ? list.filter((m) => !m.folderId) : list.filter((m) => m.folderId === folderId)
          } else if (q.folder) {
            list = list.filter((m) => m.folder === q.folder)
          }
          if (keyword) {
            list = list.filter((m) => (m.originalName || m.fileName || '').toLowerCase().includes(keyword))
          }
          return json(res, paginate([...list].reverse(), num(q.page, 1), num(q.size, 50)))
        }
        if (path === '/api/admin/media/batch/delete' && method === 'POST') {
          const body = await readBody(req)
          for (const id of body.ids || []) {
            const idx = MOCK_MEDIA.findIndex((m) => m.id === id)
            if (idx >= 0) MOCK_MEDIA.splice(idx, 1)
          }
          return json(res, (body.ids || []).length)
        }
        if (path === '/api/admin/media' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_MEDIA.map((m) => m.id)) + 1
          const item = {
            id,
            fileName: body.fileName || `file-${id}`,
            originalName: body.originalName || body.fileName || `file-${id}`,
            url: body.url || `https://picsum.photos/seed/upload${id}/600/400`,
            mimeType: body.mimeType || 'image/jpeg',
            size: Number(body.size || 102400),
            width: Number(body.width || 600),
            height: Number(body.height || 400),
            folder: body.folder || 'default',
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_MEDIA.push(item)
          return json(res, item)
        }
        if (/^\/api\/admin\/media\/\d+$/.test(path) && method === 'DELETE') {
          const id = Number(path.split('/').pop())
          const idx = MOCK_MEDIA.findIndex((m) => m.id === id)
          if (idx >= 0) MOCK_MEDIA.splice(idx, 1)
          return json(res, true)
        }
        if (path === '/api/admin/media/upload' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_MEDIA.map((m) => m.id)) + 1
          const { folderId, folder } = resolveFolder(q.folderId ?? body.folderId, q.folder ?? body.folder)
          const item = {
            id,
            fileName: body.fileName || `upload-${id}.jpg`,
            originalName: body.originalName || `upload-${id}.jpg`,
            url: body.url || `https://picsum.photos/seed/upload${id}/600/400`,
            mimeType: body.mimeType || 'image/jpeg',
            size: Number(body.size || 204800),
            width: Number(body.width || 600),
            height: Number(body.height || 400),
            folder,
            folderId,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_MEDIA.push(item)
          return json(res, item)
        }

        /* ------- 媒体目录树（t_media_folder） ------- */
        if (path === '/api/admin/media/folders/tree' && method === 'GET') {
          return json(res, buildFolderTree())
        }
        if (path === '/api/admin/media/folders' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(0, ...MOCK_MEDIA_FOLDERS.map((f) => f.id)) + 1
          MOCK_MEDIA_FOLDERS.push({
            id,
            name: body.name || `目录${id}`,
            parentId: Number(body.parentId || 0),
            sort: 0
          })
          return json(res, id)
        }
        if (/^\/api\/admin\/media\/folders\/\d+$/.test(path) && method === 'PUT') {
          const id = Number(path.split('/').pop())
          const f = MOCK_MEDIA_FOLDERS.find((x) => x.id === id)
          if (!f) return fail(res, '目录不存在', 404)
          const body = await readBody(req)
          if (body.name) f.name = body.name
          return json(res, null)
        }
        if (/^\/api\/admin\/media\/folders\/\d+$/.test(path) && method === 'DELETE') {
          const id = Number(path.split('/').pop())
          const f = MOCK_MEDIA_FOLDERS.find((x) => x.id === id)
          if (!f) return fail(res, '目录不存在', 404)
          // 与后端一致：仅空目录（无子目录且无文件）可删除
          if (MOCK_MEDIA_FOLDERS.some((x) => x.parentId === id) || MOCK_MEDIA.some((m) => m.folderId === id)) {
            return fail(res, '仅空目录可删除', 400)
          }
          MOCK_MEDIA_FOLDERS.splice(MOCK_MEDIA_FOLDERS.indexOf(f), 1)
          return json(res, null)
        }

        /* ------- 分片上传 ------- */
        if (path === '/api/admin/media/upload/chunk/init' && method === 'POST') {
          const body = await readBody(req)
          const uploadId = body.uploadId || `chunk-${Date.now()}`
          CHUNK_STORE.set(uploadId, [])
          return json(res, uploadId)
        }
        if (path === '/api/admin/media/upload/chunk' && method === 'POST') {
          const uploadId = String(q.uploadId || '')
          const index = Number(q.index)
          const parts = CHUNK_STORE.get(uploadId)
          if (!parts) return fail(res, '分片任务不存在，请先初始化', 400)
          if (!parts.includes(index)) parts.push(index)
          return json(res, null)
        }
        if (path === '/api/admin/media/upload/chunk/merge' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_MEDIA.map((m) => m.id)) + 1
          const { folderId, folder } = resolveFolder(body.folderId, body.folder)
          const name = body.originalName || `chunk-${id}.jpg`
          const item = {
            id,
            fileName: name,
            originalName: name,
            url: `https://picsum.photos/seed/chunk${id}/600/400`,
            mimeType: body.contentType || 'image/jpeg',
            size: 1024 * 512,
            width: 600,
            height: 400,
            folder,
            folderId,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          MOCK_MEDIA.push(item)
          CHUNK_STORE.delete(body.uploadId)
          return json(res, item)
        }

        /* ------- 站点设置 ------- */
        if (path === '/api/admin/settings' && method === 'GET') return json(res, MOCK_SETTINGS)
        if (path === '/api/admin/settings' && method === 'PUT') {
          const body = await readBody(req)
          Object.assign(MOCK_SETTINGS, body)
          return json(res, MOCK_SETTINGS)
        }

        /* ------- 用户 / 日志 ------- */
        if (path === '/api/admin/users' && method === 'GET') {
          const keyword = (q.keyword || '').trim().toLowerCase()
          const all = MOCK_USERS.map(({ password, ...rest }) => rest)
          const filtered = keyword
            ? all.filter(
                (u) =>
                  (u.username || '').toLowerCase().includes(keyword) ||
                  (u.nickname || '').toLowerCase().includes(keyword) ||
                  (u.email || '').toLowerCase().includes(keyword)
              )
            : all
          return json(res, paginate(filtered, num(q.page, 1), num(q.size, 20)))
        }
        if (path === '/api/admin/users/list' && method === 'GET') {
          return json(res, MOCK_USERS.map(({ password, ...rest }) => rest))
        }
        if (path === '/api/admin/users' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_USERS.map((u) => u.id)) + 1
          MOCK_USERS.push({
            id,
            username: body.username,
            nickname: body.nickname || body.username,
            avatar: '',
            email: body.email || '',
            role: body.role || 'author',
            status: 1,
            lastLoginAt: '',
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            password: body.password || '123456'
          })
          return json(res, { id })
        }
        if (/^\/api\/admin\/users\/\d+\/status$/.test(path) && method === 'PUT') {
          const id = Number(path.split('/')[4])
          const u = MOCK_USERS.find((x) => x.id === id)
          if (!u) return fail(res, '用户不存在', 404)
          u.status = q.status === '0' ? 0 : 1
          return json(res, null)
        }
        if (/^\/api\/admin\/users\/\d+\/password$/.test(path) && method === 'PUT') {
          const body = await readBody(req)
          if (!body.newPassword) return fail(res, '新密码不能为空', 400)
          return json(res, null)
        }
        if (/^\/api\/admin\/users\/\d+$/.test(path) && (method === 'PUT' || method === 'DELETE')) {
          const id = Number(path.split('/').pop())
          const u = MOCK_USERS.find((x) => x.id === id)
          if (!u) return fail(res, '用户不存在', 404)
          if (method === 'DELETE') {
            const idx = MOCK_USERS.indexOf(u)
            MOCK_USERS.splice(idx, 1)
            return json(res, true)
          }
          const body = await readBody(req)
          Object.assign(u, body)
          return json(res, { id })
        }
        if (path === '/api/admin/logs' && method === 'GET') {
          const module = q.module || ''
          const action = q.action || ''
          const keyword = (q.keyword || '').trim().toLowerCase()
          let list = MOCK_LOGS
          if (module) list = list.filter((l) => l.module === module)
          if (action) list = list.filter((l) => l.action === action)
          if (keyword) {
            list = list.filter(
              (l) =>
                (l.module || '').toLowerCase().includes(keyword) ||
                (l.action || '').toLowerCase().includes(keyword) ||
                (l.username || '').toLowerCase().includes(keyword)
            )
          }
          return json(res, paginate([...list].reverse(), num(q.page, 1), num(q.size, 10)))
        }
        if (path === '/api/admin/logs/clean' && method === 'DELETE') {
          const days = Number(q.days || 90)
          const before = Date.now() - days * 24 * 60 * 60 * 1000
          let removed = 0
          for (let i = MOCK_LOGS.length - 1; i >= 0; i--) {
            const ts = Date.parse(String(MOCK_LOGS[i].createdAt || '').replace(' ', 'T'))
            if (Number.isFinite(ts) && ts < before) {
              MOCK_LOGS.splice(i, 1)
              removed++
            }
          }
          return json(res, removed)
        }

        /* ------- 主题（与后端 AdminThemeController 同构） ------- */
        if (path === '/api/admin/themes/presets' && method === 'GET') {
          return json(
            res,
            THEME_PRESETS.map(({ id, name, description, config }) => ({ key: id, name, description, config }))
          )
        }
        if (path === '/api/admin/themes/default' && method === 'GET') {
          return json(res, MOCK_THEMES[0].config)
        }
        if (path === '/api/admin/themes/import' && method === 'POST') {
          const body = await readBody(req)
          const id = Math.max(...MOCK_THEMES.map((t) => t.id)) + 1
          MOCK_THEMES.push({
            id,
            name: body.name || `导入主题 ${id}`,
            description: body.description || '',
            config: body.config || MOCK_THEMES[0].config,
            isActive: false,
            version: 1,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          })
          return json(res, { id })
        }
        if (path === '/api/admin/themes' && method === 'GET') {
          return json(res, MOCK_THEMES)
        }
        if (path === '/api/admin/themes' && method === 'POST') {
          const body = await readBody(req)
          const copyFrom = body.copyFromId ? MOCK_THEMES.find((t) => t.id === body.copyFromId) : null
          const id = Math.max(...MOCK_THEMES.map((t) => t.id)) + 1
          MOCK_THEMES.push({
            id,
            name: body.name || `主题 ${id}`,
            description: body.description || '',
            config: JSON.parse(JSON.stringify(copyFrom ? copyFrom.config : MOCK_THEMES[0].config)),
            isActive: false,
            version: 1,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          })
          return json(res, { id })
        }
        if (/^\/api\/admin\/themes\/\d+$/.test(path) && method === 'GET') {
          const id = Number(path.split('/').pop())
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          return json(res, {
            id: t.id,
            name: t.name,
            description: t.description,
            isActive: t.isActive,
            version: t.version,
            config: t.config,
            css: themeCss(t.config)
          })
        }
        if (/^\/api\/admin\/themes\/\d+$/.test(path) && method === 'PUT') {
          const id = Number(path.split('/').pop())
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          const body = await readBody(req)
          if (body.name) t.name = body.name
          if (body.description !== undefined) t.description = body.description
          return json(res, null)
        }
        if (/^\/api\/admin\/themes\/\d+\/copy$/.test(path) && method === 'POST') {
          const id = Number(path.split('/')[4])
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          const newId = Math.max(...MOCK_THEMES.map((x) => x.id)) + 1
          MOCK_THEMES.push({
            id: newId,
            name: `${t.name} 副本`,
            description: t.description,
            config: JSON.parse(JSON.stringify(t.config)),
            isActive: false,
            version: 1,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          })
          return json(res, { id: newId })
        }
        if (/^\/api\/admin\/themes\/\d+\/config$/.test(path) && method === 'PUT') {
          const id = Number(path.split('/')[4])
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          // 请求体即 ThemeConfig
          const body = await readBody(req)
          t.config = body
          t.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
          return json(res, null)
        }
        if (/^\/api\/admin\/themes\/\d+\/activate$/.test(path) && method === 'POST') {
          const id = Number(path.split('/')[4])
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          MOCK_THEMES.forEach((x) => (x.isActive = x.id === id))
          t.version += 1
          return json(res, activeThemePayload())
        }
        if (/^\/api\/admin\/themes\/\d+\/publish$/.test(path) && method === 'POST') {
          const id = Number(path.split('/')[4])
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          const body = await readBody(req)
          if (body && body.color) t.config = body
          t.version += 1
          t.config.meta = { ...(t.config.meta || {}), version: t.version }
          MOCK_THEMES.forEach((x) => (x.isActive = x.id === id))
          t.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
          return json(res, { ...activeThemePayload(), version: t.version })
        }
        if (/^\/api\/admin\/themes\/\d+\/preview$/.test(path) && method === 'POST') {
          const id = Number(path.split('/')[4])
          const token = `preview-${Date.now()}`
          return json(res, { token, url: `/preview?token=${token}`, expiresIn: 900 })
        }
        if (/^\/api\/admin\/themes\/\d+\/export$/.test(path) && method === 'GET') {
          const id = Number(path.split('/')[4])
          const t = MOCK_THEMES.find((x) => x.id === id)
          if (!t) return fail(res, '主题不存在', 404)
          return json(res, t.config)
        }
        if (/^\/api\/admin\/themes\/\d+$/.test(path) && method === 'DELETE') {
          const id = Number(path.split('/').pop())
          const idx = MOCK_THEMES.findIndex((t) => t.id === id)
          if (idx >= 0 && !MOCK_THEMES[idx].isActive) MOCK_THEMES.splice(idx, 1)
          return json(res, null)
        }

        return fail(res, `Mock 未实现的接口：${method} ${path}`, 404)
      })
    }
  }
}
