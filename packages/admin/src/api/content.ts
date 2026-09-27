import http from './http'
import type {
  ArticleDetail,
  ArticleItem,
  CategoryItem,
  CommentItem,
  MediaFolderNode,
  MediaItem,
  PageResult,
  TagItem
} from '@blog/shared'

/* ==================== 文章（AdminArticleController） ==================== */

export interface ArticleQuery {
  keyword?: string
  /** draft / published / private */
  status?: string
  categoryId?: number
  tagId?: number
  /** article / page / note */
  type?: string
  /** latest / hot / views / oldest / created / title */
  sort?: string
  page?: number
  size?: number
}

export function fetchArticles(params: ArticleQuery): Promise<PageResult<ArticleItem>> {
  return http.get('/admin/articles', { params })
}

export function fetchArticle(id: number): Promise<ArticleDetail> {
  return http.get(`/admin/articles/${id}`)
}

export interface ArticleSavePayload {
  id?: number
  title: string
  slug?: string
  summary?: string
  cover?: string
  contentMd?: string
  status?: string
  categoryId?: number
  type?: string
  /** 后端为 Integer 0/1 */
  isTop?: number
  allowComment?: number
  publishedAt?: string
  tagIds?: number[]
  /** 不存在时后端自动创建 */
  tagNames?: string[]
}

export function createArticle(payload: ArticleSavePayload): Promise<{ id: number }> {
  return http.post('/admin/articles', payload)
}

export function updateArticle(id: number, payload: ArticleSavePayload): Promise<{ id: number }> {
  return http.put(`/admin/articles/${id}`, payload)
}

export function deleteArticle(id: number): Promise<void> {
  return http.delete(`/admin/articles/${id}`)
}

export function batchDeleteArticles(ids: number[]): Promise<number> {
  return http.post('/admin/articles/batch/delete', { ids })
}

/** 发布 / 下线 */
export function publishArticle(id: number, publish: boolean): Promise<void> {
  return http.post(`/admin/articles/${id}/publish`, null, { params: { publish } })
}

/** 置顶 / 取消置顶 */
export function topArticle(id: number, top: boolean): Promise<void> {
  return http.post(`/admin/articles/${id}/top`, null, { params: { top } })
}

/** 导出 Markdown（含 Front Matter） */
export function exportArticle(id: number): Promise<{ markdown: string }> {
  return http.get(`/admin/articles/${id}/export`)
}

/** 导入 Markdown 文件（自动识别 Front Matter） */
export function importArticle(file: File, status = 'draft'): Promise<{ id: number }> {
  const form = new FormData()
  form.append('file', file)
  return http.post('/admin/articles/import', form, {
    params: { status },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/* ==================== 分类（AdminCategoryController） ==================== */

export function fetchCategories(): Promise<CategoryItem[]> {
  return http.get('/admin/categories')
}

export interface CategorySavePayload {
  id?: number
  name: string
  slug?: string
  description?: string
  parentId?: number
  sort?: number
}

export function createCategory(payload: CategorySavePayload): Promise<number> {
  return http.post('/admin/categories', payload)
}

export function updateCategory(id: number, payload: CategorySavePayload): Promise<number> {
  return http.put(`/admin/categories/${id}`, payload)
}

/** 拖拽排序：按传入顺序重算 sort 值 */
export function sortCategories(ids: number[]): Promise<void> {
  return http.put('/admin/categories/sort', ids)
}

export function deleteCategory(id: number): Promise<void> {
  return http.delete(`/admin/categories/${id}`)
}

/* ==================== 标签（AdminTagController） ==================== */

export function fetchTags(): Promise<TagItem[]> {
  return http.get('/admin/tags')
}

export interface TagSavePayload {
  id?: number
  name: string
  slug?: string
  color?: string
}

export function createTag(payload: TagSavePayload): Promise<number> {
  return http.post('/admin/tags', payload)
}

export function updateTag(id: number, payload: TagSavePayload): Promise<number> {
  return http.put(`/admin/tags/${id}`, payload)
}

export function deleteTag(id: number): Promise<void> {
  return http.delete(`/admin/tags/${id}`)
}

/** 合并标签：sourceId 下的文章全部迁移到 targetId 后删除 sourceId */
export function mergeTags(sourceId: number, targetId: number): Promise<void> {
  return http.post('/admin/tags/merge', { sourceId, targetId })
}

/* ==================== 评论（AdminCommentController） ==================== */

export function fetchComments(params: {
  status?: string
  keyword?: string
  articleId?: number
  page?: number
  size?: number
}): Promise<PageResult<CommentItem>> {
  return http.get('/admin/comments', { params })
}

export function approveComments(ids: number[]): Promise<void> {
  if (ids.length === 1) return http.put(`/admin/comments/${ids[0]}/approve`)
  return http.post('/admin/comments/batch/approve', { ids })
}

/** 拒绝（标记垃圾）：后端仅提供单条接口，批量时逐条调用 */
export async function rejectComments(ids: number[]): Promise<void> {
  for (const id of ids) {
    await http.put(`/admin/comments/${id}/reject`)
  }
}

export function batchDeleteComments(ids: number[]): Promise<number> {
  return http.post('/admin/comments/batch/delete', { ids })
}

export function deleteComment(id: number): Promise<void> {
  return http.delete(`/admin/comments/${id}`)
}

/** 管理员回复（直接通过审核） */
export function replyComment(articleId: number, parentId: number, content: string): Promise<CommentItem> {
  return http.post('/admin/comments/reply', { articleId, parentId, content })
}

/* ==================== 媒体库（AdminMediaController） ==================== */

export function fetchMedia(params: {
  folder?: string
  /** 不传=全部，0=未分组，>0=指定目录 */
  folderId?: number
  keyword?: string
  page?: number
  size?: number
}): Promise<PageResult<MediaItem>> {
  return http.get('/admin/media', { params })
}

export function fetchMediaFolders(): Promise<string[]> {
  return http.get('/admin/media/folders')
}

/* ---------- 媒体目录（树形） ---------- */

export function fetchMediaFolderTree(): Promise<MediaFolderNode[]> {
  return http.get('/admin/media/folders/tree')
}

export function createMediaFolder(name: string, parentId?: number): Promise<number> {
  return http.post('/admin/media/folders', { name, parentId: parentId ?? 0 })
}

export function renameMediaFolder(id: number, name: string): Promise<void> {
  return http.put(`/admin/media/folders/${id}`, { name })
}

/** 仅空目录（无子目录且无文件）可删除，否则后端报错提示 */
export function deleteMediaFolder(id: number): Promise<void> {
  return http.delete(`/admin/media/folders/${id}`)
}

/** 上传文件：后端返回 Media 实体（url 为 /uploads/... 完整可访问地址） */
export async function uploadMedia(file: File, folder = '', folderId?: number): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file)
  const res = await http.post('/admin/media/upload', form, {
    params: { folder, folderId },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  // 拦截器已取出 data（统一响应体）
  return res as unknown as MediaItem
}

export function deleteMedia(id: number): Promise<void> {
  return http.delete(`/admin/media/${id}`)
}

export function batchDeleteMedia(ids: number[]): Promise<number> {
  return http.post('/admin/media/batch/delete', { ids })
}

/** 分片上传 - 初始化 */
export function initChunkUpload(uploadId: string, originalName: string): Promise<string> {
  return http.post('/admin/media/upload/chunk/init', { uploadId, originalName })
}

/** 分片上传 - 写入分片 */
export function writeChunk(file: Blob, uploadId: string, index: number): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  return http.post('/admin/media/upload/chunk', form, {
    params: { uploadId, index },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** 分片上传 - 合并 */
export function mergeChunk(payload: {
  uploadId: string
  originalName: string
  contentType: string
  folder?: string
}): Promise<MediaItem> {
  return http.post('/admin/media/upload/chunk/merge', payload)
}
