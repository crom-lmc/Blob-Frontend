<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TagItem } from '@blog/shared'
import { fetchTags } from '@/api/public'
import { useSeo } from '@/composables/useSeo'

const tags = ref<TagItem[]>([])
const keyword = ref('')
const loading = ref(true)

const filtered = computed(() =>
  tags.value.filter((t) => t.name.toLowerCase().includes(keyword.value.trim().toLowerCase()))
)

/** 字号按文章数加权 */
function tagSize(t: TagItem) {
  const counts = filtered.value.map((x) => x.articleCount || 0)
  const max = Math.max(1, ...counts)
  const min = Math.min(...counts, max)
  const ratio = max === min ? 0.5 : ((t.articleCount || 0) - min) / (max - min)
  return `${(0.9 + ratio * 0.8).toFixed(2)}rem`
}

onMounted(async () => {
  try {
    tags.value = await fetchTags()
  } finally {
    loading.value = false
  }
})

useSeo({ title: '标签', description: '按标签浏览文章' })
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1 class="page-title">标签</h1>
      <input v-model="keyword" class="input tag-filter" placeholder="筛选标签…" aria-label="筛选标签" />
    </header>

    <div v-if="loading" class="skeleton" style="height: 160px" />
    <div v-else class="tag-cloud">
      <RouterLink
        v-for="t in filtered"
        :key="t.id"
        :to="`/tags/${t.slug}`"
        class="cloud-tag"
        :style="{ color: t.color, fontSize: tagSize(t) }"
      >
        #{{ t.name }}
        <span class="muted text-xs">({{ t.articleCount }})</span>
      </RouterLink>
      <p v-if="!filtered.length" class="muted">没有匹配的标签</p>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  gap: var(--space-3);
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: var(--font-size-h2);
}

.tag-filter {
  width: 200px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: baseline;
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
}

.cloud-tag {
  transition: transform 0.15s ease;
}

.cloud-tag:hover {
  transform: translateY(-2px);
}
</style>
