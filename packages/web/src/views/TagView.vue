<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { ArticleItem, TagItem } from '@blog/shared'
import { fetchArticles, fetchTags } from '@/api/public'
import PostCard from '@/components/PostCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useSiteStore } from '@/stores/site'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()
const site = useSiteStore()

const slug = computed(() => String(route.params.slug || ''))
const tag = ref<TagItem | null>(null)
const list = ref<ArticleItem[]>([])
const total = ref(0)
const page = ref(1)
const userSize = ref<number | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const tags = await fetchTags()
    tag.value = tags.find((t) => t.slug === slug.value) || null
    if (tag.value) {
      const res = await fetchArticles({ tagId: tag.value.id, page: page.value, size: userSize.value || site.pageSize })
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

useSeo(() => ({ title: tag.value?.name ? `#${tag.value.name}` : undefined, description: `标签 ${tag.value?.name} 下的文章` }))
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1 class="page-title" :style="{ color: tag?.color }">#{{ tag?.name || '标签' }}</h1>
      <RouterLink to="/tags" class="text-sm">全部标签 →</RouterLink>
    </header>

    <SkeletonList v-if="loading" :count="3" with-cover />
    <template v-else>
      <div class="post-list">
        <PostCard v-for="a in list" :key="a.id" :article="a" />
        <p v-if="!list.length" class="muted">该标签下暂无文章</p>
      </div>
      <BasePagination :page="page" :size="site.pageSize" :total="total" @change="(p) => (page = p)" @size-change="onSizeChange" />
    </template>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  gap: var(--space-3);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-h2);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}
</style>
