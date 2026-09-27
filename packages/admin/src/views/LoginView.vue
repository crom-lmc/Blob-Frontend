<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fetchCaptcha } from '@/api/auth'
import { isNotified } from '@/api/http'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = ref({ username: 'admin', password: '123456', captchaCode: '', rememberMe: true })
const loading = ref(false)
const captcha = ref({ captchaKey: '', captchaImage: '' })

async function refreshCaptcha() {
  try {
    captcha.value = await fetchCaptcha()
  } catch {
    // 验证码接口失败时允许直接登录（后端可能关闭了验证码）
    captcha.value = { captchaKey: '', captchaImage: '' }
  }
}

async function submit() {
  loading.value = true
  try {
    await auth.login({
      username: form.value.username,
      password: form.value.password,
      captchaKey: captcha.value.captchaKey || undefined,
      captchaCode: form.value.captchaCode || undefined,
      rememberMe: form.value.rememberMe
    })
    ElMessage.success('登录成功')
    const redirect = String(route.query.redirect || '/dashboard')
    router.push(redirect)
  } catch (e: any) {
    // 错误提示已由 http 拦截器统一弹出，这里只做状态复位
    if (!isNotified(e)) ElMessage.error(e?.message || '登录失败')
    form.value.captchaCode = ''
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(refreshCaptcha)
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <h1>博客管理后台</h1>
        <p class="text-muted">动态主题博客系统 · 管理端</p>
      </div>

      <el-form :model="form" label-position="top" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password autocomplete="current-password" />
        </el-form-item>
        <el-form-item v-if="captcha.captchaImage" label="验证码">
          <div class="captcha-row">
            <el-input v-model="form.captchaCode" placeholder="请输入验证码" maxlength="4" @keyup.enter="submit" />
            <img
              :src="captcha.captchaImage"
              class="captcha"
              title="点击刷新"
              alt="验证码"
              @click="refreshCaptcha"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
        </el-form-item>
        <el-button class="submit" type="primary" :loading="loading" @click="submit">登录</el-button>
      </el-form>

      <p class="tip text-muted">默认账号见后端 DataInitializer 初始化数据（admin / author）</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff, #f8fafc 60%);
}

.login-card {
  width: 380px;
  padding: 28px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 40px -12px rgba(79, 70, 229, 0.35);
}

.login-brand {
  text-align: center;
  margin-bottom: 18px;
}

.login-brand h1 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--el-color-primary);
}

.login-brand p {
  margin: 0;
  font-size: 12px;
}

.captcha-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.captcha {
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.submit {
  width: 100%;
}

.tip {
  margin: 14px 0 0;
  font-size: 12px;
  text-align: center;
}
</style>
