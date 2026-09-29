<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import type { ArticleItem, CategoryItem, TagItem } from '@blog/shared'
import { createArticle, fetchArticle, fetchCategories, fetchTags, updateArticle } from '@/api/content'
import { isNotified } from '@/api/http'

const route = useRoute()
const router = useRouter()

const id = computed(() => (route.params.id ? Number(route.params.id) : 0))
const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const saving = ref(false)
const loading = ref(false)
const dirty = ref(false)
const lastSaved = ref('')

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  cover: '',
  contentMd: '',
  status: 'draft' as ArticleItem['status'],
  type: 'article' as ArticleItem['type'],
  categoryId: undefined as number | undefined,
  tagIds: [] as number[],
  isTop: false,
  allowComment: true
})

/** 字数与阅读时长统计 */
const wordCount = computed(() => form.contentMd.replace(/\s/g, '').length)
const readingTime = computed(() => Math.max(1, Math.round(wordCount.value / 350)))

async function load() {
  if (!id.value) return
  loading.value = true
  try {
    const a = await fetchArticle(id.value)
    Object.assign(form, {
      title: a.title,
      slug: a.slug,
      summary: a.summary,
      cover: a.cover,
      contentMd: a.contentMd || '',
      status: a.status,
      type: a.type,
      categoryId: a.categoryId,
      tagIds: (a.tags || []).map((t) => t.id),
      isTop: a.isTop,
      allowComment: a.allowComment
    })
  } finally {
    loading.value = false
  }
}

async function save(status?: ArticleItem['status']) {
  if (!form.title.trim()) {
    ElMessage.warning('请先填写标题')
    return
  }
  if (status) form.status = status
  saving.value = true
  try {
    // 后端 ArticleSaveRequest：isTop / allowComment 为 Integer 0/1
    const payload = {
      title: form.title,
      slug: form.slug || form.title.replace(/\s+/g, '-').toLowerCase(),
      summary: form.summary,
      cover: form.cover,
      contentMd: form.contentMd,
      status: form.status,
      type: form.type,
      categoryId: form.categoryId,
      tagIds: form.tagIds,
      isTop: form.isTop ? 1 : 0,
      allowComment: form.allowComment ? 1 : 0
    }
    if (id.value) {
      await updateArticle(id.value, payload)
    } else {
      const created = await createArticle(payload)
      // 新建：发布时直接去列表页，否则留在编辑器（地址补上 id）
      if (status !== 'published') router.replace(`/articles/edit/${created.id}`)
    }
    dirty.value = false
    lastSaved.value = new Date().toLocaleTimeString()
    ElMessage.success(status === 'published' ? '已发布' : '已保存')
    // 发布后回到文章列表，保存草稿则停留在当前页
    if (status === 'published') router.push('/articles')
  } catch (e: any) {
    if (!isNotified(e)) ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 自动保存草稿：每 30 秒 */
let timer: ReturnType<typeof setInterval> | undefined
function startAutoSave() {
  timer = setInterval(() => {
    if (dirty.value && form.title.trim() && id.value) {
      updateArticle(id.value, {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        cover: form.cover,
        contentMd: form.contentMd,
        status: 'draft',
        type: form.type,
        categoryId: form.categoryId,
        tagIds: form.tagIds,
        isTop: form.isTop ? 1 : 0,
        allowComment: form.allowComment ? 1 : 0
      }).then(() => {
        dirty.value = false
        lastSaved.value = new Date().toLocaleTimeString()
        ElMessage.info('已自动保存草稿')
      })
    }
  }, 30000)
}

/** 图片上传（真实后端返回完整 URL） */
function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  const urls = files.map((f) => URL.createObjectURL(f))
  callback(urls)
  ElMessage.info('已插入本地预览图，接入后端后请改用上传接口返回的地址')
}

watch(form, () => (dirty.value = true), { deep: true })

onMounted(async () => {
  await load()
  categories.value = await fetchCategories()
  tags.value = await fetchTags()
  startAutoSave()
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="admin-page" v-loading="loading">
    <div class="admin-toolbar">
      <el-input v-model="form.title" placeholder="文章标题" style="max-width: 360px" />
      <div class="spacer" />
      <span v-if="lastSaved" class="text-muted">上次保存：{{ lastSaved }}</span>
      <el-button :loading="saving" @click="save()">保存草稿</el-button>
      <el-button type="primary" :loading="saving" @click="save('published')">发布</el-button>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :md="17">
        <el-card shadow="never">
          <MdEditor
            v-model="form.contentMd"
            :style="{ height: '540px' }"
            :toolbars="['bold', 'italic', 'strikeThrough', '-', 'title', 'quote', 'code', 'table', '-', 'link', 'image', '-', 'preview', 'fullscreen']"
            @on-upload-img="onUploadImg"
          />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="7">
        <el-card shadow="never">
          <template #header>发布设置</template>
          <el-form label-position="top" size="small">
            <el-form-item label="别名 slug">
              <el-input v-model="form.slug" placeholder="留空自动生成" />
            </el-form-item>
            <el-form-item label="摘要">
              <el-input v-model="form.summary" type="textarea" :rows="3" placeholder="用于列表与 SEO 描述" />
            </el-form-item>
            <el-form-item label="封面图 URL">
              <el-input v-model="form.cover" placeholder="https://..." />
              <img v-if="form.cover" :src="form.cover" class="cover-preview" alt="封面预览" />
            </el-form-item>
            <el-form-item label="分类">
              <el-select v-model="form.categoryId" placeholder="选择分类" clearable style="width: 100%">
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签">
              <el-select v-model="form.tagIds" multiple placeholder="选择标签" style="width: 100%">
                <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="类型">
              <el-radio-group v-model="form.type">
                <el-radio-button label="article">文章</el-radio-button>
                <el-radio-button label="page">页面</el-radio-button>
                <el-radio-button label="note">笔记</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="开关">
              <el-switch v-model="form.isTop" active-text="置顶" />
              <el-switch v-model="form.allowComment" active-text="允许评论" style="margin-left: 12px" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" style="margin-top: 12px">
          <p class="text-muted stat-line">字数：{{ wordCount }} · 预计阅读 {{ readingTime }} 分钟</p>
          <p class="text-muted stat-line">状态：{{ form.status === 'published' ? '已发布' : '草稿' }}</p>
          <p class="text-muted stat-line">SEO 关键词与描述取自「摘要」字段，站点级 SEO 在「站点设置」维护</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.cover-preview {
  margin-top: 8px;
  width: 100%;
  border-radius: 6px;
  max-height: 140px;
  object-fit: cover;
}

.stat-line {
  margin: 4px 0;
  font-size: 12px;
}
</style>
