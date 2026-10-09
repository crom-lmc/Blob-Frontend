<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRoute } from 'vue-router'
import type { ArticleDetail } from '@blog/shared'
import { fetchArticle, likeArticle } from '@/api/public'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import CommentSection from '@/components/CommentSection.vue'
import TocPanel from '@/components/TocPanel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { MarkdownUtils } from '@/utils/markdown'
import { formatDate, formatCount } from '@/utils/format'
import { useSeo } from '@/composables/useSeo'

/** Markdown 兜底渲染按需加载（markdown-it + KaTeX 较大，正常情况后端已返回 content_html） */
let mdUtils: MarkdownUtils | null = null
async function getMdUtils(): Promise<MarkdownUtils> {
  if (!mdUtils) mdUtils = await import('@/utils/markdown')
  return mdUtils
}

// slug 可由路由参数给出，也可由父组件传入（后台预览时复用本页）
const props = defineProps<{ slug?: string }>()

const route = useRoute()
const site = useSiteStore()
const theme = useThemeStore()

const article = ref<ArticleDetail | null>(null)
const loading = ref(true)
const error = ref('')
/** 后端「文章不存在」→ 走友好空状态；其余错误按加载失败提示 */
const notFound = computed(() => /不存在|not\s*found|404/i.test(error.value))
const toc = ref<{ id: string; text: string; level: number }[]>([])
const liked = ref(false)

const slug = computed(() => String(props.slug || route.params.slug || ''))
/** 最终注入的正文 HTML（已加锚点 id） */
const contentHtml = ref('')

const contentWidth = computed(() => ({ maxWidth: `${theme.config.space.contentWidth}px` }))

/** 元信息展示顺序受主题控制 */
const metaOrder = computed(() => theme.layout.articleMetaOrder || [])

const metaItems = computed(() => {
  const a = article.value
  if (!a) return []
  const map: Record<string, string> = {
    date: formatDate(a.publishedAt || a.createdAt),
    category: a.categoryName || '',
    tags: (a.tags || []).map((t) => `#${t.name}`).join(' '),
    views: `${formatCount(a.viewCount)} 阅读`,
    reading: `约 ${a.readingTime} 分钟`,
    comments: `${a.commentCount} 评论`
  }
  return metaOrder.value.filter((k) => map[k]).map((k) => ({ key: k, text: map[k] }))
})

async function load() {
  loading.value = true
  error.value = ''
  article.value = null
  liked.value = false
  try {
    article.value = await fetchArticle(slug.value)
    await nextTick()
    const utils = await getMdUtils()
    // 优先使用后端渲染结果，缺失时前台兜底渲染 Markdown
    const raw = article.value.contentHtml || utils.renderMarkdown(article.value.contentMd || '')
    contentHtml.value = utils.withHeadingIds(raw)
    // 目录必须和正文实际生成的 heading id 对齐，否则点击会找不到对应章节
    const generatedToc = utils.extractToc(contentHtml.value)
    const backendToc = article.value.toc || []
    toc.value = generatedToc.length
      ? generatedToc
      : backendToc.map((x) => ({ id: x.id, text: x.text, level: x.level }))
  } catch (e: any) {
    error.value = e?.message || '文章加载失败'
  } finally {
    loading.value = false
  }
}

/** 点赞（后端直接落库并返回最新点赞数） */
async function like() {
  if (liked.value || !article.value) return
  try {
    const count = await likeArticle(article.value.slug || article.value.id)
    article.value.likeCount = count
    liked.value = true
  } catch {
    /* 忽略点赞失败 */
  }
}

/** 正文渲染后绑定代码复制按钮 */
function bindCodeCopy(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy'
    btn.textContent = '复制'
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || ''
      try {
        await navigator.clipboard.writeText(code)
        btn.textContent = '已复制'
      } catch {
        btn.textContent = '复制失败'
      }
      setTimeout(() => (btn.textContent = '复制'), 1600)
    })
    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

function onContentMounted(el: Element | ComponentPublicInstance | null) {
  const node = el as HTMLElement | null
  if (!node) return
  bindCodeCopy(node)
}

watch(slug, load)
onMounted(load)

// SEO 用 getter，文章加载完成后自动更新 title / og / JSON-LD
useSeo(() => ({
  title: article.value?.title,
  description: article.value?.summary,
  type: 'article' as const,
  jsonLd: article.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.value.title,
        description: article.value.summary,
        datePublished: article.value.publishedAt,
        dateModified: article.value.updatedAt,
        author: { '@type': 'Person', name: site.title },
        mainEntityOfPage: { '@type': 'WebPage', '@id': location.href }
      }
    : null
}))
</script>

<template>
  <div class="post-view">
    <div class="container">
      <nav v-if="theme.layout.showBreadcrumb" class="breadcrumb text-xs muted">
        <RouterLink to="/">首页</RouterLink>
        <span> / </span>
        <RouterLink to="/posts">文章</RouterLink>
        <span v-if="article?.categoryName"> / </span>
        <span v-if="article?.categoryName">{{ article.categoryName }}</span>
      </nav>

      <SkeletonList v-if="loading" :count="1" />
      <EmptyState
        v-else-if="error"
        :code="notFound ? '404' : ''"
        :title="notFound ? '没有找到这篇文章' : '文章加载失败'"
        :description="notFound ? '它可能被删除、改名，或者链接有误。去别处逛逛吧。' : error"
      >
        <RouterLink to="/" class="btn btn-primary">回到首页</RouterLink>
        <RouterLink to="/posts" class="btn">浏览全部文章</RouterLink>
      </EmptyState>

      <div v-else-if="article" class="post-layout" :class="`sidebar-${theme.layout.sidebar}`">
        <article class="post-main" :style="contentWidth">
          <header class="post-head">
            <h1 class="post-title">{{ article.title }}</h1>
            <div v-if="metaItems.length" class="post-meta muted text-sm">
              <span v-for="m in metaItems" :key="m.key">{{ m.text }}</span>
              <button class="like-btn" :class="{ liked }" @click="like">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path
                    d="M12 20s-7-4.35-9.33-8.11C1 9.16 2.4 5.5 5.9 5.06c2-.25 3.63.86 4.6 2.06.97-1.2 2.6-2.31 4.6-2.06 3.5.44 4.9 4.1 3.23 6.83C16 15.65 12 20 12 20z"
                    fill="currentColor"
                  />
                </svg>
                {{ article.likeCount }}
              </button>
            </div>
          </header>

          <img v-if="article.cover" class="post-cover" :src="article.cover" :alt="article.title" />

          <!-- 正文：v-html 内容来自后端渲染并做过白名单过滤 -->
          <div
            :ref="onContentMounted"
            class="markdown-body"
            v-html="contentHtml"
          />

          <footer class="post-foot">
            <div v-if="article.tags?.length" class="post-tags">
              <RouterLink
                v-for="t in article.tags"
                :key="t.id"
                :to="`/tags/${t.slug}`"
                class="chip chip-outline"
                :style="{ color: t.color, borderColor: t.color }"
              >
                #{{ t.name }}
              </RouterLink>
            </div>

            <nav class="post-nav">
              <RouterLink v-if="article.prev" :to="`/posts/${article.prev.slug}`" class="nav-item">
                <span class="text-xs muted">上一篇</span>
                <span class="nav-title">{{ article.prev.title }}</span>
              </RouterLink>
              <RouterLink v-if="article.next" :to="`/posts/${article.next.slug}`" class="nav-item next">
                <span class="text-xs muted">下一篇</span>
                <span class="nav-title">{{ article.next.title }}</span>
              </RouterLink>
            </nav>

            <section v-if="article.related?.length" class="related">
              <h3 class="related-title">相关阅读</h3>
              <ul>
                <li v-for="r in article.related" :key="r.id">
                  <RouterLink :to="`/posts/${r.slug}`">{{ r.title }}</RouterLink>
                </li>
              </ul>
            </section>
          </footer>

          <CommentSection v-if="article.allowComment" :article-id="article.id" />
        </article>

        <TocPanel v-if="theme.layout.showToc" :items="toc" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.breadcrumb {
  margin-bottom: var(--space-3);
}

.post-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: var(--section-gap);
  align-items: start;
}

.post-layout.sidebar-none {
  grid-template-columns: minmax(0, 1fr);
}

.post-layout.sidebar-left {
  grid-template-columns: 240px minmax(0, 1fr);
}

.post-layout.sidebar-left .post-main {
  order: 2;
}

.post-main {
  min-width: 0;
}

.post-title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-h1);
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  border-radius: var(--radius-full);
  padding: 2px var(--space-3);
  font-size: var(--font-size-xs);
  transition: all 0.15s ease;
}

.like-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.like-btn.liked {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.post-cover {
  width: 100%;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-5);
  max-height: 420px;
  object-fit: cover;
}

.post-foot {
  margin-top: var(--section-gap);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.nav-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.nav-item.next {
  text-align: right;
}

.nav-item:hover {
  border-color: var(--color-primary);
}

.nav-title {
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-title {
  font-size: var(--font-size-h6);
  margin: 0 0 var(--space-2);
}

.related ul {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--font-size-sm);
}

.related li {
  margin-bottom: var(--space-1);
}

@media (max-width: 1024px) {
  .post-layout,
  .post-layout.sidebar-left {
    grid-template-columns: minmax(0, 1fr);
  }
  .post-layout.sidebar-left .post-main {
    order: 1;
  }
}

@media (max-width: 640px) {
  .post-nav {
    grid-template-columns: 1fr;
  }
}
</style>
