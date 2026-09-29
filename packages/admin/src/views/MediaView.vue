<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { MediaFolderNode, MediaItem } from '@blog/shared'
import {
  createMediaFolder,
  deleteMedia,
  deleteMediaFolder,
  fetchMedia,
  fetchMediaFolderTree,
  renameMediaFolder,
  updateMedia,
  uploadMedia
} from '@/api/content'
import { isNotified } from '@/api/http'

const apiOrigin = (import.meta.env.VITE_API_TARGET as string) || 'http://localhost:8080'
const list = ref<MediaItem[]>([])
const total = ref(0)
const loading = ref(false)
const mode = ref<'grid' | 'list'>('grid')
const selected = ref<MediaItem | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const settingsStore = useSettingsStore()

function resolveAssetUrl(rawUrl: string) {
  if (!rawUrl) return ''
  if (/^(https?:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl
  if (!apiOrigin) return rawUrl
  return new URL(rawUrl, apiOrigin).toString()
}

/** 目录树 + 当前选中目录：-1=全部文件，>0=真实目录 */
const folderTree = ref<MediaFolderNode[]>([])
const currentFolderId = ref<number | undefined>(undefined)

const query = reactive({ folderId: undefined as number | undefined, keyword: '', page: 1, size: 24 })

/** 搜索：回到第一页再查（keyword 由后端按 originalName / fileName 模糊匹配） */
function onSearch() {
  query.page = 1
  load()
}

/** 是否选中了具体目录（上传必须落到具体目录，全部文件视图不可上传） */
const hasCurrentFolder = computed(() => (query.folderId ?? -1) > 0)

const pageSizeOptions = [10, 20, 30, 50, 100]
function onSizeChange(s: number) {
  query.size = s
  query.page = 1
  load()
}

/** el-tree 数据：固定伪节点「全部文件」+ 真实目录树 */
const displayTree = computed<MediaFolderNode[]>(() => [
  { id: -1, name: '全部文件', parentId: -1, sort: 0, mediaCount: 0 },
  ...folderTree.value
])

/** 列表视图「目录」列显示用：id → 名称 */
const folderNameMap = computed<Record<number, string>>(() => {
  const map: Record<number, string> = {}
  const walk = (nodes: MediaFolderNode[]) => {
    for (const n of nodes) {
      map[n.id] = n.name
      if (n.children?.length) walk(n.children)
    }
  }
  walk(folderTree.value)
  return map
})

const currentNodeKey = computed(() => query.folderId ?? -1)

async function loadTree() {
  try {
    folderTree.value = await fetchMediaFolderTree()
  } catch (e) {
    if (!isNotified(e)) ElMessage.error('目录加载失败')
  }
}

function onNodeClick(data: MediaFolderNode) {
  // -1=全部（不过滤）、>0=真实目录
  query.folderId = data.id > 0 ? data.id : undefined
  query.page = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchMedia({ ...query, folderId: query.folderId })
    list.value = (res.list || []).map((item) => ({
      ...item,
      url: resolveAssetUrl(item.url)
    }))
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function triggerUpload() {
  if (!hasCurrentFolder.value) {
    ElMessage.warning('请先在左侧选择一个具体目录再上传')
    return
  }
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) upload(files)
}

/** 拖拽 / 选择上传：必须先选中具体目录，上传到该目录 */
async function upload(files: FileList | File[]) {
  if (!hasCurrentFolder.value) {
    ElMessage.warning('请先在左侧选择一个具体目录再上传')
    return
  }
  const folderId = query.folderId
  let ok = 0
  for (const file of Array.from(files)) {
    try {
      await uploadMedia(file, '', folderId)
      ok += 1
    } catch (e: any) {
      // 拦截器已提示后端返回的原因，这里补充「哪个文件」的上下文
      if (!isNotified(e)) ElMessage.error(`「${file.name}」上传失败`)
    }
  }
  if (ok) ElMessage.success(`上传成功 ${ok} 个文件`)
  load()
  loadTree()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files?.length) upload(e.dataTransfer.files)
}

async function copyUrl(item: MediaItem) {
  const resolvedUrl = resolveAssetUrl(item.url)
  try {
    await navigator.clipboard.writeText(resolvedUrl)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.info(resolvedUrl)
  }
}

async function remove(item: MediaItem) {
  try {
    await ElMessageBox.confirm('确定删除该媒体文件？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteMedia(item.id)
  ElMessage.success('已删除')
  load()
  loadTree()
}

/* ---------- 目录管理 ---------- */

/** 新增目录：选中真实目录时作为其子目录，否则建在顶级 */
async function onCreateFolder() {
  try {
    const { value } = await ElMessageBox.prompt('目录名称', '新增目录', { inputValue: '新建目录' })
    if (!value?.trim()) return
    const parentId = query.folderId !== undefined && query.folderId > 0 ? query.folderId : 0
    await createMediaFolder(value.trim(), parentId)
    ElMessage.success('目录已创建')
    await loadTree()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close' && !isNotified(e)) ElMessage.error('创建失败')
  }
}

async function onRenameFolder(node: MediaFolderNode) {
  try {
    const { value } = await ElMessageBox.prompt('新的目录名称', '重命名目录', { inputValue: node.name })
    if (!value?.trim() || value.trim() === node.name) return
    await renameMediaFolder(node.id, value.trim())
    ElMessage.success('已重命名')
    await loadTree()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close' && !isNotified(e)) ElMessage.error('重命名失败')
  }
}

async function onDeleteFolder(node: MediaFolderNode) {
  try {
    await ElMessageBox.confirm(`确定删除目录「${node.name}」吗？（仅空目录可删除）`, '删除目录', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteMediaFolder(node.id)
    ElMessage.success('目录已删除')
    // 删除的是当前所在目录时退回「全部文件」
    if (query.folderId === node.id) {
      query.folderId = undefined
    }
    await loadTree()
    load()
  } catch (e: any) {
    if (!isNotified(e)) ElMessage.error('删除失败')
  }
}

/* ---------- 媒体文件：重命名 / 移动 ---------- */

/** 重命名（只改展示名 originalName，磁盘文件不变；扩展名不可修改） */
async function onRename(item: MediaItem) {
  const ext = /\.[^.]+$/.exec(item.originalName)?.[0] ?? ''
  const base = ext ? item.originalName.slice(0, -ext.length) : item.originalName
  try {
    const { value } = await ElMessageBox.prompt(
      ext ? '新的文件名称（后缀不支持修改）' : '新的文件名称',
      '重命名',
      { inputValue: base, inputPlaceholder: '文件名' }
    )
    if (!value?.trim()) return
    let next = value.trim()
    // 用户若手动输了原后缀，去掉，统一拼回原后缀
    if (ext && next.toLowerCase().endsWith(ext.toLowerCase())) {
      next = next.slice(0, -ext.length)
    }
    next = next + ext
    if (next === item.originalName) return
    await updateMedia(item.id, { name: next })
    ElMessage.success('已重命名')
    load()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close' && !isNotified(e)) ElMessage.error('重命名失败')
  }
}

/** 移动目标下拉：仅真实目录树（按层级缩进），不含「未分组」 */
const folderOptions = computed(() => {
  const out: { id: number; name: string }[] = []
  const walk = (nodes: MediaFolderNode[], depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: '　'.repeat(depth) + n.name })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(folderTree.value, 0)
  return out
})

const moveDialog = ref(false)
const moveTarget = ref<MediaItem | null>(null)
const moveFolderId = ref<number | undefined>(undefined)

function openMove(item: MediaItem) {
  moveTarget.value = item
  moveFolderId.value = item.folderId ?? undefined
  moveDialog.value = true
}

async function confirmMove() {
  if (!moveTarget.value) return
  if (moveFolderId.value === undefined) {
    ElMessage.warning('请选择目标目录')
    return
  }
  const id = moveTarget.value.id
  const folderId = moveFolderId.value
  try {
    await updateMedia(id, { folderId })
    ElMessage.success('已移动')
    moveDialog.value = false
    load()
    loadTree()
  } catch (e: any) {
    if (!isNotified(e)) ElMessage.error('移动失败')
  }
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(async () => {
  await settingsStore.load()
  query.size = settingsStore.defaultPageSize
  loadTree()
  load()
})
</script>

<template>
  <div class="admin-page media-page">
    <!-- 左：目录树 -->
    <aside class="folder-panel">
      <div class="folder-head">
        <span class="folder-title">目录</span>
        <el-button link type="primary" @click="onCreateFolder">新增目录</el-button>
      </div>
      <el-tree
        :data="displayTree"
        node-key="id"
        :props="{ label: 'name', children: 'children' }"
        :current-node-key="currentNodeKey"
        default-expand-all
        :expand-on-click-node="false"
        highlight-current
        @node-click="onNodeClick"
      >
        <template #default="{ data }">
          <span class="folder-node" :class="{ active: data.id === currentNodeKey }">
            <span class="folder-name">
              {{ data.name }}
              <span v-if="data.mediaCount" class="folder-count">（{{ data.mediaCount }}）</span>
            </span>
            <span v-if="data.id > 0" class="folder-ops" @click.stop>
              <el-icon title="重命名" @click="onRenameFolder(data)"><Edit /></el-icon>
              <el-icon title="删除目录" @click="onDeleteFolder(data)"><Delete /></el-icon>
            </span>
          </span>
        </template>
      </el-tree>
    </aside>

    <!-- 右：媒体内容 -->
    <section class="content-panel">
      <div class="admin-toolbar">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button label="grid">网格</el-radio-button>
          <el-radio-button label="list">列表</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="query.keyword"
          placeholder="搜索文件名"
          clearable
          size="small"
          style="width: 200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <div class="spacer" />
        <el-button type="primary" @click="triggerUpload">上传</el-button>
        <input ref="fileInput" type="file" multiple accept="image/*" style="display: none" @change="onFileChange" />
      </div>

      <div class="drop-zone" @dragover.prevent @drop="onDrop">
        <span class="text-muted">
          {{
            hasCurrentFolder
              ? '拖拽图片到此处上传（单文件 ≤ 5MB，白名单：jpg/png/gif/webp）'
              : '请先在左侧选择一个目录，再拖拽图片到此处上传'
          }}
        </span>
      </div>

      <!-- 网格视图 -->
      <div v-if="mode === 'grid'" v-loading="loading" class="media-grid">
        <div v-for="m in list" :key="m.id" class="media-item" @click="selected = m">
          <img :src="m.url" :alt="m.originalName" />
          <div class="media-mask">
            <el-button size="small" @click.stop="copyUrl(m)">复制链接</el-button>
            <el-button size="small" type="primary" @click.stop="onRename(m)">重命名</el-button>
            <el-button size="small" type="warning" @click.stop="openMove(m)">移动</el-button>
            <el-button size="small" type="danger" @click.stop="remove(m)">删除</el-button>
          </div>
          <p class="media-name">{{ m.originalName }}</p>
        </div>
        <el-empty v-if="!list.length" class="media-empty" description="暂无媒体文件" />
      </div>

      <!-- 列表视图 -->
      <el-table v-else v-loading="loading" :data="list">
        <el-table-column prop="originalName" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column label="目录" width="130">
          <template #default="{ row }">
            {{ row.folderId ? folderNameMap[row.folderId] || '—' : '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="mimeType" label="类型" width="140" />
        <el-table-column label="大小" width="100" align="right">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="copyUrl(row)">复制链接</el-button>
            <el-button link @click="onRename(row)">重命名</el-button>
            <el-button link @click="openMove(row)">移动</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        :page-size="query.size"
        :page-sizes="pageSizeOptions"
        :total="total"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="load"
        @size-change="onSizeChange"
      />

      <!-- 移动到目录 -->
      <el-dialog v-model="moveDialog" title="移动到目录" width="380px">
        <el-form label-position="top" size="small">
          <el-form-item label="目标目录">
            <el-select v-model="moveFolderId" placeholder="请选择目标目录" style="width: 100%">
              <el-option v-for="o in folderOptions" :key="o.id" :label="o.name" :value="o.id" />
            </el-select>
          </el-form-item>
          <p class="text-muted">仅改变文件所属目录，磁盘上的物理文件位置不变。</p>
        </el-form>
        <template #footer>
          <el-button @click="moveDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmMove">确定</el-button>
        </template>
      </el-dialog>

      <!-- 点击图片预览大图（复制链接/删除按钮已 stop 冒泡，不会触发） -->
      <el-image-viewer
        v-if="selected"
        :url-list="[selected.url]"
        @close="selected = null"
      />
    </section>
  </div>
</template>

<style scoped>
.media-page {
  display: flex;
  gap: 12px;
  align-items: stretch;
  /* 填满 el-main 内容区，上下留 16px（.admin-page 的 padding） */
  min-height: 100%;
}

/* 左：目录树面板 */
.folder-panel {
  flex: 0 0 220px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 10px;
  align-self: stretch;
  overflow-y: auto;
}

.folder-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 8px;
}

.folder-title {
  font-size: 13px;
  font-weight: 600;
}

.folder-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.folder-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.folder-ops {
  display: none;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.folder-ops .el-icon:hover {
  color: var(--el-color-primary);
}

.folder-node:hover .folder-ops {
  display: inline-flex;
}

/* 右：内容面板 */
.content-panel {
  flex: 1;
  min-width: 0;
}

.content-panel .admin-toolbar {
  margin-bottom: 12px;
}

.drop-zone {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

/* 空状态横跨整行并居中显示 */
.media-empty {
  grid-column: 1 / -1;
  justify-self: center;
}

.media-item {
  position: relative;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.media-item img {
  width: 100%;
  height: 110px;
  object-fit: cover;
}

.media-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 四个操作按钮在窄卡片里换行显示 */
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.55);
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* 遮罩里的按钮尺寸紧凑一些，避免盖住太多图片 */
.media-mask :deep(.el-button + .el-button) {
  margin-left: 0;
}

.media-item:hover .media-mask {
  opacity: 1;
}

.media-name {
  margin: 0;
  padding: 6px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1024px) {
  .media-page {
    flex-direction: column;
  }
  .folder-panel {
    flex: none;
    width: 100%;
  }
}
</style>
