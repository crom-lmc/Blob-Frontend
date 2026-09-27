<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CommentItem } from '@blog/shared'
import {
  approveComments,
  batchDeleteComments,
  deleteComment,
  fetchComments,
  rejectComments,
  replyComment
} from '@/api/content'

const list = ref<CommentItem[]>([])
const total = ref(0)
const loading = ref(false)
const selected = ref<CommentItem[]>([])
const settingsStore = useSettingsStore()

const query = reactive({ status: 'pending', page: 1, size: 10 })

const tabs = [
  { name: 'pending', label: '待审核' },
  { name: 'approved', label: '已通过' },
  { name: 'spam', label: '垃圾箱' },
  { name: 'deleted', label: '已删除' }
]

const pageSizeOptions = [10, 20, 30, 50, 100]
function onSizeChange(s: number) {
  query.size = s
  query.page = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchComments(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function approve(row: CommentItem, status: 'approved' | 'spam') {
  if (status === 'approved') await approveComments([row.id])
  else await rejectComments([row.id])
  ElMessage.success(status === 'approved' ? '已通过' : '已标记垃圾')
  load()
}

/** 管理员回复（后端以管理员身份落库并直接通过审核） */
async function reply(row: CommentItem) {
  try {
    const { value } = await ElMessageBox.prompt('回复内容', '回复评论', { inputType: 'textarea' })
    if (!value) return
    await replyComment(row.articleId, row.id, value)
    ElMessage.success('回复成功')
    load()
  } catch {
    /* 用户取消 */
  }
}

async function remove(row: CommentItem) {
  try {
    await ElMessageBox.confirm('确定删除该评论？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteComment(row.id)
  ElMessage.success('已删除')
  load()
}

async function batch(type: 'approved' | 'spam' | 'deleted') {
  if (!selected.value.length) return
  const ids = selected.value.map((c) => c.id)
  if (type === 'approved') await approveComments(ids)
  else if (type === 'spam') await rejectComments(ids)
  else await batchDeleteComments(ids)
  ElMessage.success('批量处理完成')
  load()
}

onMounted(async () => {
  await settingsStore.load()
  query.size = settingsStore.defaultPageSize
  load()
})
</script>

<template>
  <div class="admin-page">
    <el-tabs v-model="query.status" @tab-change="load">
      <el-tab-pane v-for="t in tabs" :key="t.name" :label="t.label" :name="t.name" />
    </el-tabs>

    <div class="admin-toolbar">
      <el-button type="success" :disabled="!selected.length" @click="batch('approved')">批量通过</el-button>
      <el-button type="warning" :disabled="!selected.length" @click="batch('spam')">批量垃圾</el-button>
      <el-button type="danger" :disabled="!selected.length" @click="batch('deleted')">批量删除</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ total }} 条</span>
    </div>

    <el-table v-loading="loading" :data="list" @selection-change="(v: CommentItem[]) => (selected = v)">
      <el-table-column type="selection" width="42" />
      <el-table-column prop="authorName" label="用户" width="130">
        <template #default="{ row }">
          <span>{{ row.authorName }}</span>
          <el-tag v-if="row.isAdmin" size="small" type="primary" style="margin-left: 4px">作者</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
      <el-table-column prop="articleTitle" label="文章" min-width="140" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column prop="createdAt" label="时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="success" @click="approve(row, 'approved')">通过</el-button>
          <el-button link @click="reply(row)">回复</el-button>
          <el-button link type="warning" @click="approve(row, 'spam')">垃圾</el-button>
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
  </div>
</template>
