<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ArchiveGroup } from '@blog/shared'
import { fetchArchives } from '@/api/public'
import { useSeo } from '@/composables/useSeo'

const groups = ref<ArchiveGroup[]>([])
const loading = ref(true)
const activeYear = ref(0)

/** 后端按 yyyy-MM 聚合，这里再按年归并展示 */
const years = computed(() => {
  const map = new Map<number, ArchiveGroup[]>()
  groups.value.forEach((g) => {
    if (!map.has(g.year)) map.set(g.year, [])
    map.get(g.year)!.push(g)
  })
  return [...map.entries()].map(([year, months]) => ({
    year,
    months,
    total: months.reduce((s, g) => s + g.count, 0)
  }))
})

const total = computed(() => years.value.reduce((s, y) => s + y.total, 0))

function jump(year: number) {
  activeYear.value = year
  const el = document.getElementById(`year-${year}`)
  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
}

onMounted(async () => {
  try {
    groups.value = await fetchArchives()
    activeYear.value = years.value[0]?.year || 0
  } finally {
    loading.value = false
  }
})

useSeo({ title: '归档', description: '按时间归档的全部文章' })
</script>

<template>
  <div class="container archives">
    <header class="page-head">
      <h1 class="page-title">归档</h1>
      <span class="muted text-sm">共 {{ total }} 篇</span>
    </header>

    <div v-if="loading" class="skeleton" style="height: 240px" />

    <div v-else class="archive-layout">
      <!-- 年份锚点 -->
      <nav class="year-nav">
        <button
          v-for="y in years"
          :key="y.year"
          class="year-btn"
          :class="{ active: activeYear === y.year }"
          @click="jump(y.year)"
        >
          {{ y.year }}
          <span class="muted text-xs">({{ y.total }})</span>
        </button>
      </nav>

      <div class="timeline">
        <section v-for="y in years" :id="`year-${y.year}`" :key="y.year" class="year-group">
          <h2 class="year-title">{{ y.year }} 年 · {{ y.total }} 篇</h2>
          <div v-for="g in y.months" :key="g.month" class="month-group">
            <p class="month-label muted text-sm">{{ g.month.replace('-', ' 年 ') }} 月 · {{ g.count }} 篇</p>
            <ul class="month-list">
              <li v-for="item in g.items" :key="item.slug">
                <span class="dot" />
                <RouterLink :to="`/posts/${item.slug}`">{{ item.title }}</RouterLink>
                <span class="muted text-xs date">{{ item.date }}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  gap: var(--space-3);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-h2);
}

.archive-layout {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: var(--section-gap);
  align-items: start;
}

.year-nav {
  position: sticky;
  top: calc(var(--header-height) + var(--space-4));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.year-btn {
  text-align: left;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  font-size: var(--font-size-sm);
}

.year-btn.active,
.year-btn:hover {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-left-color: var(--color-primary);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
}

.year-title {
  font-size: var(--font-size-h3);
  margin: 0 0 var(--space-3);
  scroll-margin-top: calc(var(--header-height) + var(--space-4));
}

.month-group {
  margin-bottom: var(--space-5);
}

.month-label {
  margin: 0 0 var(--space-2);
}

.month-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 var(--space-4);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.month-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  margin-left: -3px;
  flex-shrink: 0;
}

.date {
  margin-left: auto;
}

@media (max-width: 640px) {
  .archive-layout {
    grid-template-columns: 1fr;
  }
  .year-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
