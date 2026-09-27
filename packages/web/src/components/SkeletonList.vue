<script setup lang="ts">
defineProps<{ count?: number; withCover?: boolean }>()
</script>

<template>
  <div class="skeleton-list">
    <div v-for="i in (count ?? 4)" :key="i" class="skeleton-item">
      <div v-if="withCover" class="skeleton skeleton-cover" />
      <div class="skeleton-body">
        <div class="skeleton skeleton-line title" />
        <div class="skeleton skeleton-line" />
        <div class="skeleton skeleton-line short" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.skeleton-item {
  display: flex;
  gap: var(--card-padding);
}

.skeleton-cover {
  width: 180px;
  height: 120px;
  flex-shrink: 0;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-line {
  height: 14px;
}

.skeleton-line.title {
  height: 22px;
  width: 60%;
}

.skeleton-line.short {
  width: 40%;
}

@media (max-width: 640px) {
  .skeleton-item {
    flex-direction: column;
  }
  .skeleton-cover {
    width: 100%;
  }
}
</style>
