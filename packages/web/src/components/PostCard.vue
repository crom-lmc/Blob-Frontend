<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleItem } from '@blog/shared'
import { useThemeStore } from '@/stores/theme'
import { formatCount, formatDate } from '@/utils/format'

const props = defineProps<{ article: ArticleItem; keyword?: string }>()
const theme = useThemeStore()

const fields = computed(() => theme.layout.postCardFields || [])
const coverPosition = computed(() => theme.layout.coverPosition)
const cardClass = computed(() => `card-style-${theme.layout.cardStyle}`)

const has = (f: string) => fields.value.includes(f)
const link = computed(() => `/posts/${props.article.slug}`)
</script>

<template>
  <article class="post-card" :class="[cardClass, `cover-${coverPosition}`]">
    <RouterLink v-if="has('cover') && article.cover" :to="link" class="cover-wrap">
      <img :src="article.cover" :alt="article.title" loading="lazy" />
    </RouterLink>

    <div class="card-body">
      <h3 v-if="has('title')" class="card-title">
        <RouterLink :to="link">{{ article.title }}</RouterLink>
        <span v-if="article.isTop" class="chip top-chip">置顶</span>
      </h3>

      <p v-if="has('excerpt') && theme.layout.showExcerpt && article.summary" class="card-excerpt muted">
        {{ article.summary }}
      </p>

      <div v-if="has('meta')" class="card-meta muted text-xs">
        <span v-if="article.publishedAt">{{ formatDate(article.publishedAt) }}</span>
        <span v-if="article.categoryName">· {{ article.categoryName }}</span>
        <span>· {{ formatCount(article.viewCount) }} 阅读</span>
        <span>· 约 {{ article.readingTime }} 分钟</span>
      </div>

      <div v-if="has('tags') && article.tags?.length" class="card-tags">
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
    </div>
  </article>
</template>

<style scoped>
.post-card {
  display: flex;
  gap: var(--card-padding);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.post-card:hover {
  transform: translateY(-2px);
}

.cover-top {
  flex-direction: column;
}

.cover-left {
  flex-direction: row;
  align-items: center;
}

.cover-wrap {
  display: block;
  overflow: hidden;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.cover-top .cover-wrap {
  width: 100%;
  aspect-ratio: 16 / 7;
}

.cover-left .cover-wrap {
  width: 180px;
  height: 120px;
}

.cover-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.post-card:hover .cover-wrap img {
  transform: scale(1.03);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: var(--font-size-h4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-title a {
  color: var(--color-text);
}

.card-title a:hover {
  color: var(--color-primary);
}

.top-chip {
  font-size: var(--font-size-xs);
}

.card-excerpt {
  margin: 0;
  font-size: var(--font-size-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* 背景封面模式：图片作为卡片背景 */
.cover-background {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  align-items: flex-end;
}

.cover-background .cover-wrap {
  position: absolute;
  inset: 0;
  border-radius: 0;
}

.cover-background .cover-wrap img {
  filter: brightness(0.62);
}

.cover-background .card-body {
  position: relative;
  z-index: 1;
  color: var(--color-text-invert);
  background: linear-gradient(transparent, var(--color-shadow));
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

.cover-background .card-title a,
.cover-background .card-meta {
  color: var(--color-text-invert);
}

@media (max-width: 640px) {
  .cover-left {
    flex-direction: column;
  }
  .cover-left .cover-wrap {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 8;
  }
}
</style>
