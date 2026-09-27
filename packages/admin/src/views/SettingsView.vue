<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FriendLink, SiteSettings, SocialLink } from '@blog/shared'
import { fetchSettings, saveSettings } from '@/api/system'

const loading = ref(false)
const tab = ref('basic')
const settings = reactive<SiteSettings>({
  site_title: '',
  site_subtitle: '',
  site_logo: '',
  site_favicon: '',
  site_footer: '',
  icp_no: '',
  seo_keywords: '',
  seo_desc: '',
  comment_review_on: 'true',
  page_size: '10',
  friend_links: '[]',
  social_links: '[]'
})

/** 友链 / 社交链接以 JSON 字符串存储，这里用数组编辑后序列化 */
const friendLinks = ref<FriendLink[]>([])
const socialLinks = ref<SocialLink[]>([])

function parse<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

async function load() {
  loading.value = true
  try {
    const data = await fetchSettings()
    Object.assign(settings, data)
    friendLinks.value = parse<FriendLink>(data.friend_links)
    socialLinks.value = parse<SocialLink>(data.social_links)
  } finally {
    loading.value = false
  }
}

async function save() {
  loading.value = true
  try {
    await saveSettings({
      ...settings,
      friend_links: JSON.stringify(friendLinks.value),
      social_links: JSON.stringify(socialLinks.value)
    })
    ElMessage.success('设置已保存')
  } finally {
    loading.value = false
  }
}

function addLink(type: 'friend' | 'social') {
  if (type === 'friend') friendLinks.value.push({ name: '', url: '', desc: '' })
  else socialLinks.value.push({ name: '', url: '', icon: '' })
}

function removeLink(type: 'friend' | 'social', index: number) {
  if (type === 'friend') friendLinks.value.splice(index, 1)
  else socialLinks.value.splice(index, 1)
}

onMounted(load)
</script>

<template>
  <div class="admin-page" v-loading="loading">
    <el-tabs v-model="tab">
      <!-- 基础信息 -->
      <el-tab-pane label="基础信息" name="basic">
        <el-form label-position="top" size="small" style="max-width: 640px">
          <el-form-item label="站点标题">
            <el-input v-model="settings.site_title" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="settings.site_subtitle" />
          </el-form-item>
          <el-form-item label="Logo URL">
            <el-input v-model="settings.site_logo" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="Favicon URL">
            <el-input v-model="settings.site_favicon" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="页脚文案">
            <el-input v-model="settings.site_footer" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="备案号">
            <el-input v-model="settings.icp_no" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- SEO -->
      <el-tab-pane label="SEO" name="seo">
        <el-form label-position="top" size="small" style="max-width: 640px">
          <el-form-item label="关键词">
            <el-input v-model="settings.seo_keywords" placeholder="英文逗号分隔" />
          </el-form-item>
          <el-form-item label="站点描述">
            <el-input v-model="settings.seo_desc" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="列表每页条数">
            <el-input-number v-model="settings.page_size" :min="1" :max="100" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 评论策略 -->
      <el-tab-pane label="评论策略" name="comment">
        <el-form label-position="top" size="small" style="max-width: 640px">
          <el-form-item label="评论需审核">
            <el-switch v-model="settings.comment_review_on" active-value="true" inactive-value="false" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <p class="text-muted">关闭后评论即时展示；建议开启，配合敏感词过滤使用。</p>
        </el-form>
      </el-tab-pane>

      <!-- 友链 -->
      <el-tab-pane label="友情链接" name="friend">
        <div v-for="(link, i) in friendLinks" :key="i" class="link-row">
          <el-input v-model="link.name" placeholder="名称" style="width: 160px" />
          <el-input v-model="link.url" placeholder="链接地址" style="flex: 1" />
          <el-input v-model="link.desc" placeholder="描述（可选）" style="width: 200px" />
          <el-button type="danger" link @click="removeLink('friend', i)">删除</el-button>
        </div>
        <el-button size="small" @click="addLink('friend')">+ 添加友链</el-button>
      </el-tab-pane>

      <!-- 社交链接 -->
      <el-tab-pane label="社交链接" name="social">
        <div v-for="(item, i) in socialLinks" :key="i" class="link-row">
          <el-input v-model="item.name" placeholder="名称" style="width: 160px" />
          <el-input v-model="item.url" placeholder="地址" style="flex: 1" />
          <el-input v-model="item.icon" placeholder="图标标识" style="width: 160px" />
          <el-button type="danger" link @click="removeLink('social', i)">删除</el-button>
        </div>
        <el-button size="small" @click="addLink('social')">+ 添加链接</el-button>
      </el-tab-pane>
    </el-tabs>

    <div class="footer-bar">
      <el-button @click="load">恢复</el-button>
      <el-button type="primary" @click="save">保存设置</el-button>
    </div>
  </div>
</template>

<style scoped>
.link-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.footer-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
