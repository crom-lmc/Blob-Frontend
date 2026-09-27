<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CategoryItem } from '@blog/shared'
import { fetchCategories } from '@/api/public'
import { useSeo } from '@/composables/useSeo'

const categories = ref<CategoryItem[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    categories.value = await fetchCategories()
  } finally {
    loading.value = false
  }
})

useSeo({ title: '分类', description: '按分类浏览全部文章' })
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1 class="page-title">分类</h1>
      <span class="muted text-sm">共 {{ categories.length }} 个分类</span>
    </header>

    <div v-if="loading" class="grid">
      <div v-for="i in 4" :key="i" class="skeleton" style="height: 120px" />
    </div>

    <div v-else class="grid">
      <RouterLink v-for="c in categories" :key="c.id" :to="`/categories/${c.slug}`" class="cat-card card card-style-bordered">
        <h2 class="cat-name">{{ c.name }}</h2>
        <p v-if="c.description" class="muted text-sm">{{ c.description }}</p>
        <span class="chip">{{ c.articleCount }} 篇</span>
        <ul v-if="c.children?.length" class="children">
          <li v-for="child in c.children" :key="child.id">
            <RouterLink :to="`/categories/${child.slug}`" class="text-sm">{{ child.name }}</RouterLink>
            <span class="muted text-xs">（{{ child.articleCount }}）</span>
          </li>
        </ul>
      </RouterLink>
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

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}

.cat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text);
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.cat-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.cat-name {
  margin: 0;
  font-size: var(--font-size-h5);
}

.children {
  list-style: none;
  margin: var(--space-1) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
