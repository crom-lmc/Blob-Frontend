<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CategoryItem } from '@blog/shared'
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '@/api/content'

const list = ref<CategoryItem[]>([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref<CategoryItem | null>(null)
const form = ref({ name: '', slug: '', description: '', parentId: 0, sort: 99 })

async function load() {
  loading.value = true
  try {
    list.value = await fetchCategories()
  } finally {
    loading.value = false
  }
}

function openDialog(row?: CategoryItem) {
  editing.value = row || null
  form.value = row
    ? { name: row.name, slug: row.slug, description: row.description, parentId: row.parentId, sort: row.sort }
    : { name: '', slug: '', description: '', parentId: 0, sort: 99 }
  dialog.value = true
}

async function submit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  const payload = {
    ...form.value,
    slug: form.value.slug || form.value.name.toLowerCase().replace(/\s+/g, '-')
  }
  if (editing.value) await updateCategory(editing.value.id, payload)
  else await createCategory(payload)
  ElMessage.success('已保存')
  dialog.value = false
  load()
}

async function remove(row: CategoryItem) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteCategory(row.id)
  ElMessage.success('已删除')
  load()
}

const parentName = (id: number) => list.value.find((c) => c.id === id)?.name || '—'

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <div class="admin-toolbar">
      <el-button type="primary" @click="openDialog()">新建分类</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ list.length }} 个分类</span>
    </div>

    <el-table v-loading="loading" :data="list" row-key="id" default-expand-all>
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="slug" label="别名" width="160" />
      <el-table-column label="父级" width="120">
        <template #default="{ row }">{{ row.parentId ? parentName(row.parentId) : '顶级' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="articleCount" label="文章数" width="90" align="right" />
      <el-table-column prop="sort" label="排序" width="90" align="right" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="editing ? '编辑分类' : '新建分类'" width="440px">
      <el-form label-position="top" size="small">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="别名">
          <el-input v-model="form.slug" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="父级分类">
          <el-select v-model="form.parentId" style="width: 100%">
            <el-option label="顶级分类" :value="0" />
            <el-option v-for="c in list.filter((x) => !x.parentId)" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
