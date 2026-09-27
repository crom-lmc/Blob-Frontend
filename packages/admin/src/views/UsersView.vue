<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UserItem } from '@blog/shared'
import { changeUserPassword, createUser, deleteUser, fetchUsers, updateUser, updateUserStatus } from '@/api/system'

const list = ref<UserItem[]>([])
const total = ref(0)
const loading = ref(false)
const dialog = ref(false)
const editing = ref<UserItem | null>(null)
const query = reactive({ keyword: '', page: 1, size: 20 })
const settingsStore = useSettingsStore()

const pageSizeOptions = [10, 20, 30, 50, 100]
function onSizeChange(s: number) {
  query.size = s
  query.page = 1
  load()
}

const form = ref({
  username: '',
  nickname: '',
  email: '',
  role: 'author' as string,
  status: 1,
  password: ''
})

async function load() {
  loading.value = true
  try {
    const res = await fetchUsers(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openDialog(row?: UserItem) {
  editing.value = row || null
  form.value = row
    ? { username: row.username, nickname: row.nickname, email: row.email, role: row.role, status: row.status, password: '' }
    : { username: '', nickname: '', email: '', role: 'author', status: 1, password: '' }
  dialog.value = true
}

async function submit() {
  if (!form.value.username.trim()) {
    ElMessage.warning('请填写用户名')
    return
  }
  if (editing.value) {
    await updateUser(editing.value.id, {
      username: form.value.username,
      nickname: form.value.nickname,
      email: form.value.email,
      role: form.value.role,
      status: form.value.status
    })
    // 填写了新密码时走重置密码接口
    if (form.value.password) {
      await changeUserPassword(editing.value.id, form.value.password)
    }
  } else {
    if (!form.value.password) {
      ElMessage.warning('请设置初始密码')
      return
    }
    await createUser({ ...form.value })
  }
  ElMessage.success('已保存')
  dialog.value = false
  load()
}

async function toggleStatus(row: UserItem) {
  await updateUserStatus(row.id, row.status === 1 ? 0 : 1)
  ElMessage.success('状态已更新')
  load()
}

async function remove(row: UserItem) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteUser(row.id)
  ElMessage.success('已删除')
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
      <el-input v-model="query.keyword" placeholder="用户名/昵称/邮箱" clearable style="width: 200px" @keyup.enter="load" />
      <el-button @click="load">查询</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openDialog()">新建用户</el-button>
    </div>

    <el-table v-loading="loading" :data="list">
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="nickname" label="昵称" width="140" />
      <el-table-column prop="email" label="邮箱" min-width="200" />
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'primary' : 'info'" size="small">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="170" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link @click="toggleStatus(row)">{{ row.status === 1 ? '停用' : '启用' }}</el-button>
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

    <el-dialog v-model="dialog" :title="editing ? '编辑用户' : '新建用户'" width="440px">
      <el-form label-position="top" size="small">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!editing" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员 admin" value="admin" />
            <el-option label="作者 author" value="author" />
          </el-select>
        </el-form-item>
        <el-form-item :label="editing ? '重置密码（留空不修改）' : '初始密码'">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
