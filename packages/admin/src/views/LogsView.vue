<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { OperationLogItem } from '@blog/shared'
import { cleanLogs, fetchLogs } from '@/api/system'

const list = ref<OperationLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ module: '', page: 1, size: 10 })
const settingsStore = useSettingsStore()

const pageSizeOptions = [10, 20, 30, 50, 100]
function onSizeChange(s: number) {
  query.size = s
  query.page = 1
  load()
}

const modules = ['article', 'theme', 'comment', 'media', 'setting']

async function load() {
  loading.value = true
  try {
    const res = await fetchLogs(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

/** 清理 90 天前的历史日志 */
async function clean() {
  try {
    await ElMessageBox.confirm('确定清理 90 天前的历史日志？', '清理日志', { type: 'warning' })
  } catch {
    return
  }
  const count = await cleanLogs(90)
  ElMessage.success(`已清理 ${count} 条`)
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
    <div class="admin-toolbar">
      <el-select v-model="query.module" placeholder="模块筛选" clearable style="width: 160px" @change="load">
        <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
      </el-select>
      <el-button @click="load">刷新</el-button>
      <el-button type="danger" plain @click="clean">清理 90 天前日志</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ total }} 条</span>
    </div>

    <el-table v-loading="loading" :data="list">
      <el-table-column prop="createdAt" label="时间" width="170" />
      <el-table-column prop="userId" label="操作人 ID" width="110" align="center" />
      <el-table-column prop="module" label="模块" width="110">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.module }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="action" label="动作" width="100" />
      <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="140" />
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
