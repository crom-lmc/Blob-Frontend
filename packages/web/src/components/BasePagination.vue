<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ page: number; size: number; total: number; sizeOptions?: number[] }>()
const emit = defineEmits<{
  (e: 'change', page: number): void
  (e: 'size-change', size: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))
const options = computed(() => props.sizeOptions ?? [10, 20, 30, 50])

/** 生成页码（最多显示 7 个，带省略号） */
const pages = computed<(number | '…')[]>(() => {
  const total = totalPages.value
  const cur = props.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
})

function go(p: number | '…') {
  if (p === '…' || p === props.page) return
  emit('change', p)
}

function onSizeChange(e: Event) {
  emit('size-change', Number((e.target as HTMLSelectElement).value))
}
</script>

<template>
  <div v-if="totalPages > 1" class="pagination" aria-label="分页">
    <select class="page-size" :value="size" @change="onSizeChange" aria-label="每页条数">
      <option v-for="o in options" :key="o" :value="o">{{ o }} 条/页</option>
    </select>
    <nav class="pager" aria-label="页码">
      <button class="page-btn" :disabled="page <= 1" @click="go(page - 1)">上一页</button>
      <button
        v-for="(p, i) in pages"
        :key="`${p}-${i}`"
        class="page-btn"
        :class="{ active: p === page, ellipsis: p === '…' }"
        @click="go(p)"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page >= totalPages" @click="go(page + 1)">下一页</button>
    </nav>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin: var(--section-gap) 0;
}

.page-size {
  height: 36px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.pager {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled):not(.ellipsis) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
