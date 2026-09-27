<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ArticleItem } from '@blog/shared'
import { searchArticles } from '@/api/public'
import { formatCount, formatDate } from '@/utils/format'
import { useSiteStore } from '@/stores/site'
import { useSeo } from '@/composables/useSeo'
import SkeletonList from '@/components/SkeletonList.vue'
import BasePagination from '@/components/BasePagination.vue'

const route = useRoute()
const router = useRouter()
const site = useSiteStore()

const input = ref(String(route.query.q || ''))
const results = ref<ArticleItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)
const userSize = ref<number | null>(null)

const size = computed(() => userSize.value || site.pageSize || 10)

// URL 作为唯一真实来源：q / page / sort 全部写入地址栏，可分享可收藏
const keyword = computed(() => String(route.query.q || '').trim())
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const sort = computed<'relevance' | 'latest'>(() =>
  route.query.sort === 'latest' ? 'latest' : 'relevance'
)

let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  const q = keyword.value
  if (!q) {
    results.value = []
    total.value = 0
    searched.value = false
    error.value = null
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await searchArticles(q, page.value, size.value, sort.value)
    results.value = res.list
    total.value = res.total
    searched.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : '搜索失败，请稍后重试'
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 顶部/页内搜索框：输入防抖 300ms 自动搜索（文档 3.1 / 3.5） */
function onInput() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    router.replace({ name: 'search', query: { q: input.value.trim() || undefined, page: 1, sort: sort.value } })
  }, 300)
}

function submitSearch() {
  clearTimeout(timer)
  router.replace({ name: 'search', query: { q: input.value.trim() || undefined, page: 1, sort: sort.value } })
}

function changeSort(s: 'relevance' | 'latest') {
  if (s === sort.value) return
  router.replace({ name: 'search', query: { q: keyword.value || undefined, page: 1, sort: s } })
}

function changePage(p: number) {
  router.replace({ name: 'search', query: { q: keyword.value || undefined, page: p, sort: sort.value } })
}

function onSizeChange(s: number) {
  userSize.value = s
  if (page.value !== 1) changePage(1)
  else load()
}

// q / page / sort 任一变化都重新检索；进入分享链接时同步输入框
watch(
  () => [route.query.q, route.query.page, route.query.sort],
  () => {
    const q = String(route.query.q || '')
    if (q !== input.value) input.value = q
    load()
  }
)

onMounted(load)

useSeo(() => ({ title: keyword.value ? `搜索：${keyword.value}` : '搜索', description: '站内全文搜索' }))
</script>

<template>
  <div class="container search-view">
    <header class="page-head">
      <h1 class="page-title">搜索</h1>
      <form class="search-box" role="search" @submit.prevent="submitSearch">
        <svg viewBox="0 0 24 24" width="16" height="16" class="search-icon" aria-hidden="true">
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <input
          v-model="input"
          class="input search-input"
          type="search"
          placeholder="输入关键词，支持标题与正文"
          aria-label="搜索关键词"
          @input="onInput"
        />
        <button class="btn btn-primary" type="submit">搜索</button>
      </form>
    </header>

    <!-- 空关键词引导 -->
    <p v-if="!keyword" class="muted empty-hint">输入关键词开始搜索</p>

    <template v-else>
      <!-- 工具栏：结果数 + 排序切换 -->
      <div class="toolbar">
        <p class="muted text-sm result-count">
          <template v-if="loading">搜索中…</template>
          <template v-else-if="searched">找到 {{ total }} 条与“{{ keyword }}”相关的内容</template>
        </p>
        <div class="sort-tabs">
          <button class="tab" :class="{ active: sort === 'relevance' }" @click="changeSort('relevance')">相关</button>
          <button class="tab" :class="{ active: sort === 'latest' }" @click="changeSort('latest')">最新</button>
        </div>
      </div>

      <!-- 骨架屏 -->
      <SkeletonList v-if="loading" :count="5" />

      <!-- 接口异常：不白屏，提供重试 -->
      <div v-else-if="error" class="error-box">
        <p class="muted">{{ error }}</p>
        <button class="btn" type="button" @click="load">重试</button>
      </div>

      <!-- 结果列表 -->
      <template v-else-if="searched">
        <ul v-if="results.length" class="result-list">
          <li v-for="a in results" :key="a.id" class="result-item">
            <RouterLink :to="`/posts/${a.slug}`" class="result-title">{{ a.title }}</RouterLink>
            <!-- 高亮仅渲染后端 highlight 字段（已含 <mark> 且经 XSS 过滤）；缺失则降级纯文本摘要 -->
            <p class="result-summary text-sm muted">
              <span v-if="a.highlight" v-html="a.highlight" />
              <template v-else>{{ a.summary }}</template>
            </p>
            <p class="result-meta muted text-xs">
              <span>{{ formatDate(a.publishedAt) }}</span>
              <span v-if="a.categoryName">· {{ a.categoryName }}</span>
              <span>· {{ formatCount(a.viewCount) }} 阅读</span>
            </p>
          </li>
        </ul>
        <p v-else class="muted empty-hint">没有找到与“{{ keyword }}”相关的内容，换个关键词试试。</p>

        <BasePagination :page="page" :size="size" :total="total" @change="changePage" @size-change="onSizeChange" />
      </template>
    </template>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: var(--space-4);
}

.page-title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-h2);
}

.search-box {
  position: relative;
  display: flex;
  gap: var(--space-2);
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  padding-left: var(--space-8);
  flex: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.result-count {
  margin: 0;
}

.sort-tabs {
  display: inline-flex;
  gap: var(--space-1);
  padding: 3px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.tab {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
}

.tab.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.result-item {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.result-title {
  font-size: var(--font-size-h5);
  font-weight: var(--heading-weight);
  color: var(--color-text);
}

.result-title:hover {
  color: var(--color-primary);
}

.result-summary {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.empty-hint {
  padding: var(--space-6) 0;
}

.error-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) 0;
}
</style>
