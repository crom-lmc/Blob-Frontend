<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TagItem } from '@blog/shared'
import { colorFromName } from '@blog/shared'
import { createTag, deleteTag, fetchTags, mergeTags, updateTag } from '@/api/content'
import { isNotified } from '@/api/http'

const list = ref<TagItem[]>([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref<TagItem | null>(null)
const form = ref({ name: '', slug: '', color: '#4f46e5' })

async function load() {
  loading.value = true
  try {
    list.value = await fetchTags()
  } finally {
    loading.value = false
  }
}

function openDialog(row?: TagItem) {
  editing.value = row || null
  form.value = row
    ? { name: row.name, slug: row.slug, color: row.color }
    : { name: '', slug: '', color: colorFromName(String(Date.now())) }
  dialog.value = true
}

async function submit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  const payload = { ...form.value, slug: form.value.slug || form.value.name.toLowerCase().replace(/\s+/g, '-') }
  if (editing.value) await updateTag(editing.value.id, payload)
  else await createTag(payload)
  ElMessage.success('已保存')
  dialog.value = false
  load()
}

async function remove(row: TagItem) {
  try {
    await ElMessageBox.confirm(`确定删除标签「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteTag(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e: any) {
    // 被文章引用时后端返回 2010，把具体原因提示出来
    if (!isNotified(e)) ElMessage.error(e?.message || '删除失败')
  }
}

/** 合并标签：sourceId 下的文章全部迁移到 targetId 后删除 sourceId */
async function merge() {
  if (list.value.length < 2) return
  const [source, target] = list.value
  try {
    await ElMessageBox.confirm(`将「${source.name}」合并到「${target.name}」并删除前者？`, '合并标签', { type: 'warning' })
  } catch {
    return
  }
  await mergeTags(source.id, target.id)
  ElMessage.success('已合并')
  load()
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <el-button type="primary" @click="openDialog()">新建标签</el-button>
      <el-button :disabled="list.length < 2" @click="merge">合并标签</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ list.length }} 个标签</span>
    </div>

    <el-table v-loading="loading" :data="list">
      <el-table-column label="名称" min-width="160">
        <template #default="{ row }">
          <el-tag :color="row.color" effect="dark" size="small">{{ row.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="slug" label="别名" width="180" />
      <el-table-column prop="color" label="颜色" width="110">
        <template #default="{ row }">
          <span class="color-dot" :style="{ background: row.color }" />{{ row.color }}
        </template>
      </el-table-column>
      <el-table-column prop="articleCount" label="文章数" width="100" align="right" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="editing ? '编辑标签' : '新建标签'" width="420px">
      <el-form label-position="top" size="small">
        <el-form-item label="名称">
          <el-input v-model="form.name" @change="form.color = form.color || colorFromName(form.name)" />
        </el-form-item>
        <el-form-item label="别名">
          <el-input v-model="form.slug" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="form.color" show-alpha :predefine="[]" />
          <span class="color-dot" :style="{ background: form.color }" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
