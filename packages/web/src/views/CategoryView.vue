<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ArticleItem, CategoryItem } from '@blog/shared'
import { fetchArticles, fetchCategories } from '@/api/public'
import PostCard from '@/components/PostCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useSiteStore } from '@/stores/site'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()
const site = useSiteStore()

const slug = computed(() => String(route.params.slug || ''))
const category = ref<CategoryItem | null>(null)
const list = ref<ArticleItem[]>([])
const total = ref(0)
const page = ref(1)
const userSize = ref<number | null>(null)
const loading = ref(true)

function flatten(list: CategoryItem[]): CategoryItem[] {
  return list.flatMap((c) => [c, ...flatten(c.children || [])])
}

async function load() {
  loading.value = true
  try {
    if (!category.value) {
      const cats = flatten(await fetchCategories())
      category.value = cats.find((c) => c.slug === slug.value) || null
    }
    if (category.value) {
      const res = await fetchArticles({
        categoryId: category.value.id,
        page: page.value,
        size: userSize.value || site.pageSize
      })
      list.value = res.list
      total.value = res.total
    }
  } finally {
    loading.value = false
  }
}

function onSizeChange(s: number) {
  userSize.value = s
  if (page.value !== 1) page.value = 1
  else load()
}

watch([slug, page], load)
onMounted(load)

useSeo(() => ({ title: category.value?.name, description: category.value?.description }))
</script>

<template>
  <div class="container">
    <header class="page-head">
      <div>
        <h1 class="page-title">{{ category?.name || '分类' }}</h1>
        <p v-if="category?.description" class="muted text-sm">{{ category.description }}</p>
      </div>
      <RouterLink to="/categories" class="text-sm">全部分类 →</RouterLink>
    </header>

    <SkeletonList v-if="loading" :count="3" with-cover />
    <template v-else>
      <div class="post-list">
        <PostCard v-for="a in list" :key="a.id" :article="a" />
        <p v-if="!list.length" class="muted">该分类下暂无文章</p>
      </div>
      <BasePagination :page="page" :size="site.pageSize" :total="total" @change="(p) => (page = p)" @size-change="onSizeChange" />
    </template>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  gap: var(--space-3);
}

.page-title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-h2);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}
</style>
