<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { changeUserPassword } from '@/api/system'
import { isNotified } from '@/api/http'
import http from '@/api/http'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const collapsed = ref(false)

/** 站点 logo（公开接口，无需管理员权限）；为空时回退为字母块 */
const apiOrigin = (import.meta.env.VITE_API_TARGET as string) || 'http://localhost:8080'
const siteLogo = ref('')

function resolveAssetUrl(rawUrl: string) {
  if (!rawUrl) return ''
  if (/^(https?:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl
  if (!apiOrigin) return rawUrl
  return new URL(rawUrl, apiOrigin).toString()
}

onMounted(async () => {
  try {
    const data: any = await http.get('/public/settings')
    siteLogo.value = resolveAssetUrl(data?.settings?.site_logo || '')
  } catch {
    /* 拿不到就用默认字母块 */
  }
})

/** 前台访问地址，「查看前台」按钮跳这里（dev 下 define 不生效，统一走 import.meta.env） */
const webOrigin = (import.meta.env.VITE_WEB_ORIGIN as string) || 'http://localhost:5173'

/** 菜单：admin 全权限，author 仅文章/媒体/评论 */
const menus = computed(() => {
  const all = [
    { path: '/dashboard', title: '仪表盘', icon: 'DataLine', admin: false },
    { path: '/articles', title: '文章管理', icon: 'Document', admin: false },
    { path: '/categories', title: '分类管理', icon: 'Folder', admin: false },
    { path: '/tags', title: '标签管理', icon: 'CollectionTag', admin: false },
    { path: '/comments', title: '评论管理', icon: 'ChatDotRound', admin: false },
    { path: '/media', title: '媒体库', icon: 'Picture', admin: false },
    { path: '/theme', title: '主题编辑器', icon: 'Brush', admin: false },
    { path: '/settings', title: '站点设置', icon: 'Setting', admin: true },
    { path: '/users', title: '用户管理', icon: 'User', admin: true },
    { path: '/logs', title: '操作日志', icon: 'Tickets', admin: true }
  ]
  return all.filter((m) => !m.admin || auth.isAdmin)
})

const activeMenu = computed(() => {
  const p = route.path
  // 文章编辑页高亮到文章管理
  if (p.startsWith('/articles')) return '/articles'
  return p
})

const breadcrumb = computed(() =>
  route.matched.filter((r) => r.meta?.title).map((r) => String(r.meta.title))
)

async function logout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
  } catch {
    return
  }
  auth.logout()
  router.push({ name: 'login' })
}

/* ---------- 修改密码 ---------- */
const pwdDialog = ref(false)
const pwdFormRef = ref<FormInstance | null>(null)
const pwdSubmitting = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

/** 危险字符：控制符/空白/引号/反引号/反斜杠/尖括号/&| $ ;（避免注入与转义问题） */
const DANGEROUS_PASSWORD_CHAR = /[\u0000-\u001f\u007f\s"'\\`<>&\|$;]/

/** 复杂度：数字 / 大写字母 / 小写字母 / 特殊字符，至少包含三种；且不得含危险字符 */
function checkPasswordComplexity(value: string): boolean {
  if (!value) return false
  if (DANGEROUS_PASSWORD_CHAR.test(value)) return false
  const kinds = [/[0-9]/, /[a-z]/, /[A-Z]/, /[^0-9a-zA-Z]/]
  return kinds.filter((re) => re.test(value)).length >= 3
}

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 32, message: '密码长度 8-32 位', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (DANGEROUS_PASSWORD_CHAR.test(value)) {
          callback(new Error('不能包含空白、引号、反斜杠、< > & | $ ; 等危险字符'))
        } else if (!checkPasswordComplexity(value)) {
          callback(new Error('需包含数字、大小写字母、特殊字符中至少三种'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error('两次输入的新密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

function onCommand(command: string) {
  if (command === 'logout') logout()
  else if (command === 'password') openPwdDialog()
}

function openPwdDialog() {
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdDialog.value = true
}

async function submitPassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdSubmitting.value = true
  try {
    await changeUserPassword(auth.user!.id, pwdForm.oldPassword, pwdForm.newPassword)
    ElMessage.success('密码修改成功，请牢记新密码')
    pwdDialog.value = false
  } catch (e) {
    if (!isNotified(e)) ElMessage.error('修改失败')
  } finally {
    pwdSubmitting.value = false
  }
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-aside">
      <div class="brand" :class="{ collapsed }">
        <img v-if="siteLogo" :src="siteLogo" class="brand-logo" alt="logo" />
        <span v-else class="brand-logo brand-fallback">B</span>
        <span v-if="!collapsed" class="brand-text">博客后台</span>
      </div>
      <el-menu :default-active="activeMenu" :collapse="collapsed" router unique-opened>
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <el-button text :icon="collapsed ? 'Expand' : 'Fold'" @click="collapsed = !collapsed" />
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="b in breadcrumb" :key="b">{{ b }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-button text tag="a" :href="webOrigin" target="_blank" rel="noopener">查看前台</el-button>
          <el-dropdown @command="onCommand">
            <span class="user">
              <el-icon><User /></el-icon>
              <span>{{ auth.nickname }}</span>
              <el-tag v-if="auth.isAdmin" size="small" type="primary" class="role-tag">admin</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="admin-main">
        <RouterView />
      </el-main>
    </el-container>

    <!-- 修改密码 -->
    <el-dialog v-model="pwdDialog" title="修改密码" width="400px" :close-on-click-modal="false">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px" @keyup.enter="submitPassword">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="8-32 位" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialog = false">取消</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="submitPassword">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<style scoped>
.admin-layout {
  height: 100%;
}

.admin-aside {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.2s ease;
  overflow-x: hidden;
}

.brand {
  height: var(--admin-header-height);
  display: flex;
  align-items: center;
  gap: 10px;
  /* 左缩进与 el-menu-item 的 20px 对齐 */
  padding: 0 20px;
  overflow: hidden;
  white-space: nowrap;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 缩回侧栏时只显示 logo，居中 */
.brand.collapsed {
  padding: 0;
  justify-content: center;
}

.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}

/* 无 logo 时的字母块兜底 */
.brand-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-primary);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}

.brand-text {
  font-weight: 700;
  font-size: 15px;
  color: var(--el-color-primary);
}

.admin-header {
  height: var(--admin-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
}

.role-tag {
  margin-left: 4px;
}

.admin-main {
  padding: 0;
  overflow-x: hidden;
}

@media (max-width: 640px) {
  .admin-aside {
    position: fixed;
    z-index: 20;
    height: 100%;
  }
}
</style>
