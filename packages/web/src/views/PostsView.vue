<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ArticleItem } from '@blog/shared'
import { fetchArticles } from '@/api/public'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import PostCard from '@/components/PostCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()
const router = useRouter()
const site = useSiteStore()
const theme = useThemeStore()

const list = ref<ArticleItem[]>([])
const total = ref(0)
const loading = ref(true)
const sort = ref<'latest' | 'hot'>('latest')
const userSize = ref<number | null>(null)

const page = computed(() => Number(route.params.page || route.query.page || 1))
const size = computed(() => userSize.value || site.pageSize)

async function load() {
  loading.value = true
  try {
    const res = await fetchArticles({ page: page.value, size: size.value, sort: sort.value })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function changePage(p: number) {
  if (p === 1) router.push({ name: 'posts' })
  else router.push({ name: 'posts-page', params: { page: String(p) } })
}

function onSizeChange(s: number) {
  userSize.value = s
  if (page.value !== 1) changePage(1)
  else load()
}

watch([page, sort], load)
onMounted(load)

useSeo({ title: '文章列表', description: site.settings.seo_desc })
</script>

<template>
  <div class="posts-view container">
    <header class="page-head">
      <h1 class="page-title">文章</h1>
      <div class="sort-tabs">
        <button class="tab" :class="{ active: sort === 'latest' }" @click="sort = 'latest'">最新</button>
        <button class="tab" :class="{ active: sort === 'hot' }" @click="sort = 'hot'">最热</button>
      </div>
    </header>

    <SkeletonList v-if="loading" :count="5" with-cover />
    <div v-else class="post-list" :class="`layout-${theme.layout.homeLayout}`">
      <PostCard v-for="a in list" :key="a.id" :article="a" />
      <p v-if="!list.length" class="muted">暂无文章</p>
    </div>

    <BasePagination :page="page" :size="size" :total="total" @change="changePage" @size-change="onSizeChange" />
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--section-gap);
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: var(--font-size-h2);
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

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.layout-magazine {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}

.layout-magazine :deep(.post-card:first-child) {
  grid-column: 1 / -1;
}
</style>
