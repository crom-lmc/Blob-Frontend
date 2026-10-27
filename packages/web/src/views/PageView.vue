<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ArticleDetail } from '@blog/shared'
import { copyText } from '@blog/shared'
import { fetchPage } from '@/api/public'
import { useThemeStore } from '@/stores/theme'
import type { MarkdownUtils } from '@blog/shared/markdown'
import { useSiteStore } from '@/stores/site'
import { useSeo } from '@/composables/useSeo'
import EmptyState from '@/components/EmptyState.vue'
import { normalizeHtmlAssets } from '@/utils/asset'

const route = useRoute()
const theme = useThemeStore()
const site = useSiteStore()

const page = ref<ArticleDetail | null>(null)
const loading = ref(true)
const contentHtml = ref('')
const slug = computed(() => String(route.params.slug || ''))

/** Markdown 兜底渲染按需加载 */
async function getMdUtils(): Promise<MarkdownUtils> {
  return import('@blog/shared/markdown')
}

/** 友链页特殊渲染：使用站点设置中的 friend_links */
const friendLinks = computed(() => site.friendLinks)
const isLinksPage = computed(() => slug.value === 'links')

async function load() {
  loading.value = true
  try {
    // 自定义页面走后端 /public/pages/{slug} 接口；统一增强（代码块/公式/任务列表）
    page.value = await fetchPage(slug.value)
    const utils = await getMdUtils()
    let html = page.value.contentHtml || ''
    if (!html && page.value.contentMd) {
      html = utils.renderMarkdown(page.value.contentMd)
    }
    contentHtml.value = utils.enhanceHtml(normalizeHtmlAssets(html))
  } catch {
    page.value = null
    contentHtml.value = ''
  } finally {
    loading.value = false
  }
}

/** 正文渲染后绑定代码复制按钮（渲染管线已输出 .md-code-block__copy[data-copy]） */
function bindCodeCopy(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>('[data-copy]').forEach((btn) => {
    if (btn.dataset.bound) return
    btn.dataset.bound = '1'
    btn.addEventListener('click', async () => {
      const code = btn.closest('.md-code-block')?.querySelector('code')?.textContent || ''
      const label = btn.dataset.label || btn.textContent || '复制代码'
      btn.dataset.label = label
      btn.textContent = (await copyText(code)) ? '已复制' : '复制失败'
      setTimeout(() => (btn.textContent = label), 1600)
    })
  })
}

watch(slug, load)
watch(contentHtml, async () => {
  await nextTick()
  const node = document.querySelector('.page-view .markdown-body')
  if (node) bindCodeCopy(node as HTMLElement)
})
onMounted(load)

useSeo(() => ({ title: page.value?.title, description: page.value?.summary }))
</script>

<template>
  <div class="container page-view">
    <div v-if="loading" class="skeleton" style="height: 200px" />
    <template v-else-if="page">
      <h1 class="page-title">{{ page.title }}</h1>
      <!-- 后端已渲染并过滤，直接使用 -->
      <div class="markdown-body" :style="{ maxWidth: `${theme.config.space.contentWidth}px` }" v-html="contentHtml" />

      <div v-if="isLinksPage && friendLinks.length" class="links">
        <a v-for="f in friendLinks" :key="f.url" :href="f.url" target="_blank" rel="noopener" class="link-card card card-style-bordered">
          <span class="link-name">{{ f.name }}</span>
          <span v-if="f.desc" class="muted text-sm">{{ f.desc }}</span>
        </a>
      </div>
    </template>
    <EmptyState
      v-else
      code="404"
      title="页面不存在或已下线"
      description="你要找的页面可能已被移动或删除。"
    >
      <RouterLink to="/" class="btn btn-primary">回到首页</RouterLink>
    </EmptyState>
  </div>
</template>

<style scoped>
.page-title {
  margin: 0 0 var(--space-5);
  font-size: var(--font-size-h2);
}

.links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-top: var(--section-gap);
}

.link-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  color: var(--color-text);
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.link-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.link-name {
  font-weight: var(--heading-weight);
}
</style>
