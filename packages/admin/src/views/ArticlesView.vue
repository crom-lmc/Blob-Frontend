<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ArticleItem, CategoryItem, TagItem } from '@blog/shared'
import {
  batchDeleteArticles,
  deleteArticle,
  exportArticle,
  fetchArticles,
  fetchCategories,
  fetchTags,
  publishArticle,
  topArticle
} from '@/api/content'

const router = useRouter()
const settingsStore = useSettingsStore()

const list = ref<ArticleItem[]>([])
const total = ref(0)
const loading = ref(false)
const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const selected = ref<ArticleItem[]>([])

const pageSizeOptions = [10, 20, 30, 50, 100]
function onSizeChange(s: number) {
  query.size = s
  query.page = 1
  load()
}

const query = reactive({
  keyword: '',
  status: '',
  categoryId: undefined as number | undefined,
  tagId: undefined as number | undefined,
  page: 1,
  size: 10
})

const statusOptions = [
  { value: 'published', label: '已发布', type: 'success' },
  { value: 'draft', label: '草稿', type: 'info' },
  { value: 'private', label: '私密', type: 'warning' }
]

/**
 * 后端返回 'YYYY-MM-DDTHH:mm:ss'（24 字符），直接塞进表格列会被挤成多行。
 * 列表只展示到分钟，且字符串本身就是本地时间，切片即可，无需 Date 解析。
 */
function formatDateTime(input?: string | null) {
  if (!input) return '—'
  return String(input).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  try {
    const res = await fetchArticles({ ...query, status: query.status || undefined })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function reset() {
  Object.assign(query, { keyword: '', status: '', categoryId: undefined, tagId: undefined, page: 1 })
  load()
}

async function onToggle(row: ArticleItem, type: 'publish' | 'top') {
  if (type === 'publish') {
    const publish = row.status !== 'published'
    await publishArticle(row.id, publish)
    ElMessage.success(publish ? '已发布' : '已转为草稿')
  } else {
    const top = !row.isTop
    await topArticle(row.id, top)
    ElMessage.success(top ? '已置顶' : '已取消置顶')
  }
  load()
}

/** 导出 Markdown（含 Front Matter） */
async function onExport(row: ArticleItem) {
  const res = await exportArticle(row.id)
  const blob = new Blob([res.markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${row.slug || row.id}.md`
  a.click()
  URL.revokeObjectURL(url)
}

async function onDelete(row: ArticleItem) {
  try {
    await ElMessageBox.confirm(`确定删除《${row.title}》吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await deleteArticle(row.id)
  ElMessage.success('已删除')
  load()
}

async function batchDelete() {
  if (!selected.value.length) return
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selected.value.length} 篇文章吗？`, '批量删除', { type: 'warning' })
  } catch {
    return
  }
  await batchDeleteArticles(selected.value.map((i) => i.id))
  ElMessage.success('批量删除完成')
  load()
}

onMounted(async () => {
  await settingsStore.load()
  query.size = settingsStore.defaultPageSize
  await load()
  categories.value = await fetchCategories()
  tags.value = await fetchTags()
})
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <el-input v-model="query.keyword" placeholder="搜索标题/摘要" clearable style="width: 200px" @keyup.enter="load" />
      <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px" @change="load">
        <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
      <el-tree-select
        v-model="query.categoryId"
        :data="categories"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        check-strictly
        default-expand-all
        :render-after-expand="false"
        placeholder="分类"
        clearable
        style="width: 160px"
        @change="load"
      />
      <el-select v-model="query.tagId" placeholder="标签" clearable style="width: 140px" @change="load">
        <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
      <el-button type="primary" @click="load">查询</el-button>
      <el-button @click="reset">重置</el-button>
      <div class="spacer" />
      <el-button type="danger" :disabled="!selected.length" @click="batchDelete">批量删除</el-button>
      <el-button type="primary" @click="router.push('/articles/edit')">写文章</el-button>
    </div>

    <el-table v-loading="loading" :data="list" @selection-change="(v: ArticleItem[]) => (selected = v)">
      <el-table-column type="selection" width="42" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.isTop" class="top-flag">置顶</span>
          {{ row.title }}
        </template>
      </el-table-column>
      <el-table-column prop="categoryName" label="分类" width="110" />
      <el-table-column label="标签" width="160">
        <template #default="{ row }">
          <el-tag v-for="t in row.tags" :key="t.id" size="small" :color="t.color" effect="dark" style="margin-right: 4px">
            {{ t.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusOptions.find((s) => s.value === row.status)?.type as any" size="small">
            {{ statusOptions.find((s) => s.value === row.status)?.label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="阅读" width="90" align="right" />
      <el-table-column label="发布时间" width="170">
        <template #default="{ row }">
          <span class="col-nowrap" :class="{ 'text-muted': !row.publishedAt }">{{ formatDateTime(row.publishedAt) }}</span>
        </template>
      </el-table-column>
      <!-- 操作列宽度需同时容纳「取消置顶」这一最宽状态（约 284px），否则 5 个按钮会折行 -->
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/articles/edit/${row.id}`)">编辑</el-button>
          <el-button link @click="onToggle(row, 'publish')">{{ row.status === 'published' ? '转草稿' : '发布' }}</el-button>
          <el-button link @click="onToggle(row, 'top')">{{ row.isTop ? '取消置顶' : '置顶' }}</el-button>
          <el-button link @click="onExport(row)">导出</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
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
  </div>
</template>

<style scoped>
/* 日期等短内容不折行：Element Plus 的 .el-table .cell 默认 white-space: normal */
.col-nowrap {
  white-space: nowrap;
}

.top-flag {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--el-color-primary);
  color: #fff;
}
</style>
