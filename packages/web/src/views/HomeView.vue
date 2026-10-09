<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ArticleItem, TagItem } from '@blog/shared'
import { fetchArticles, fetchTags } from '@/api/public'
import { useThemeStore } from '@/stores/theme'
import { useSiteStore } from '@/stores/site'
import PostCard from '@/components/PostCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseCarousel from '@/components/BaseCarousel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useSeo } from '@/composables/useSeo'

const theme = useThemeStore()
const site = useSiteStore()

const articles = ref<ArticleItem[]>([])
const tags = ref<TagItem[]>([])
const total = ref(0)
const page = ref(1)
const userSize = ref<number | null>(null)
const loading = ref(true)
const loadError = ref('')

/** 启用的首页区块（按 order 排序，order 由后台拖拽决定） */
const blocks = computed(() => theme.homeBlocks.filter((b) => b.enabled))
const hasBlock = (type: string) => blocks.value.some((b) => b.type === type)
const blockProps = (type: string) => blocks.value.find((b) => b.type === type)?.props || {}

const pageSize = computed(() => userSize.value || Number(blockProps('latest').count) || site.pageSize || 10)
const heroProps = computed(() => blockProps('hero'))
/** 头部横幅配置的轮播项（{ image, link }；为空则回退为文字横幅） */
const heroSlides = computed(() => {
  const imgs = heroProps.value?.images
  if (!Array.isArray(imgs)) return []
  return imgs.filter((it: any) => {
    if (typeof it === 'string') return !!it
    return !!it?.image && it.published !== false
  })
})

const featured = computed(() => {
  const count = Number(blockProps('featured').count) || 3
  return [...articles.value].sort((a, b) => Number(b.isTop) - Number(a.isTop) || b.viewCount - a.viewCount).slice(0, count)
})

/** 精选文章里只要有一篇配了封面，就给没封面的补占位块保持高度一致；全都没有封面则不补 */
const featuredHasCover = computed(() => featured.value.some((a) => !!a.cover))

const cloudTags = computed(() => {
  const count = Number(blockProps('tagCloud').count) || 30
  return tags.value.slice(0, count)
})

/** 标签云字号按文章数加权 */
function tagSize(t: TagItem) {
  const max = Math.max(1, ...cloudTags.value.map((x) => x.articleCount || 0))
  const min = Math.min(...cloudTags.value.map((x) => x.articleCount || 0), max)
  const ratio = max === min ? 0.5 : ((t.articleCount || 0) - min) / (max - min)
  return `${(0.85 + ratio * 0.75).toFixed(2)}rem`
}

async function loadArticles() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await fetchArticles({ page: page.value, size: pageSize.value, sort: 'latest' })
    articles.value = res.list
    total.value = res.total
  } catch (e: any) {
    loadError.value = e?.message || '文章加载失败'
  } finally {
    loading.value = false
  }
}

async function loadTags() {
  try {
    tags.value = await fetchTags()
  } catch {
    tags.value = []
  }
}

function subscribe() {
  window.alert('订阅功能需在后台接入邮件服务（当前为演示）')
}

function onSizeChange(s: number) {
  userSize.value = s
  if (page.value !== 1) page.value = 1
  else loadArticles()
}

watch(page, loadArticles)
onMounted(() => {
  loadArticles()
  loadTags()
})

useSeo({ title: '首页', description: site.settings.seo_desc })
</script>

<template>
  <div class="home container">
    <!-- Hero：配置了轮播图则显示轮播，否则显示文字横幅 -->
    <template v-if="hasBlock('hero')">
      <BaseCarousel v-if="heroSlides.length" :items="heroSlides" :align="heroProps.align || 'center'" />
      <section v-else class="hero" :class="`align-${heroProps.align || 'center'}`">
        <h1 class="hero-title">{{ heroProps.title || site.title }}</h1>
        <p class="hero-sub muted">{{ heroProps.subtitle || site.subtitle }}</p>
        <div class="hero-actions">
          <RouterLink to="/posts" class="btn btn-primary">开始阅读</RouterLink>
          <RouterLink to="/archives" class="btn">浏览归档</RouterLink>
        </div>
      </section>
    </template>

    <div class="stack">
      <!-- 精选 -->
      <section v-if="hasBlock('featured')" class="block">
        <div class="block-head">
          <h2 class="block-title">精选文章</h2>
          <RouterLink to="/posts" class="text-sm">查看全部 →</RouterLink>
        </div>
        <div class="featured-grid">
          <PostCard v-for="a in featured" :key="a.id" :article="a" :placeholder-cover="featuredHasCover" />
        </div>
      </section>

      <!-- 最新 -->
      <section v-if="hasBlock('latest')" class="block">
        <div class="block-head">
          <h2 class="block-title">最新文章</h2>
          <span class="muted text-sm">共 {{ total }} 篇</span>
        </div>

        <SkeletonList v-if="loading" :count="4" with-cover />
        <p v-else-if="loadError" class="muted">{{ loadError }}</p>

        <template v-else>
          <div class="post-list" :class="`layout-${theme.layout.homeLayout}`">
            <PostCard v-for="a in articles" :key="a.id" :article="a" />
          </div>
          <BasePagination :page="page" :size="pageSize" :total="total" @change="(p) => (page = p)" @size-change="onSizeChange" />
        </template>
      </section>

      <!-- 标签云 -->
      <section v-if="hasBlock('tagCloud') && cloudTags.length" class="block">
        <div class="block-head">
          <h2 class="block-title">标签云</h2>
          <RouterLink to="/tags" class="text-sm">全部标签 →</RouterLink>
        </div>
        <div class="tag-cloud">
          <RouterLink
            v-for="t in cloudTags"
            :key="t.id"
            :to="`/tags/${t.slug}`"
            class="cloud-tag"
            :style="{ color: t.color, fontSize: tagSize(t) }"
          >
            #{{ t.name }}
          </RouterLink>
        </div>
      </section>

      <!-- 订阅 -->
      <section v-if="hasBlock('newsletter')" class="block newsletter">
        <div>
          <h2 class="block-title">订阅更新</h2>
          <p class="muted text-sm">新文章发布时第一时间通知你，不发广告。</p>
        </div>
        <button class="btn btn-primary" @click="subscribe">立即订阅</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

.hero {
  padding: calc(var(--section-gap) * 1.6) var(--card-padding);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-subtle), var(--color-bg-subtle));
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero.align-center {
  align-items: center;
  text-align: center;
}

.hero.align-left {
  align-items: flex-start;
  text-align: left;
}

.hero-title {
  margin: 0;
  font-size: var(--font-size-h1);
}

.hero-sub {
  margin: 0;
  font-size: var(--font-size-h5);
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
  flex-wrap: wrap;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  gap: var(--space-3);
}

.block-title {
  margin: 0;
  font-size: var(--font-size-h4);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

/* 网格布局 */
.layout-grid,
.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.layout-grid :deep(.post-card),
.featured-grid :deep(.post-card) {
  flex-direction: column;
}

/* 杂志布局：首篇大图 + 其余列表 */
.layout-magazine {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}

.layout-magazine :deep(.post-card:first-child) {
  grid-column: 1 / -1;
}

.layout-magazine :deep(.post-card:first-child) .card-title {
  font-size: var(--font-size-h2);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.cloud-tag {
  opacity: 0.85;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.cloud-tag:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.newsletter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
  border: 1px dashed var(--color-border);
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .hero {
    padding: var(--section-gap) var(--space-4);
  }
}
</style>
